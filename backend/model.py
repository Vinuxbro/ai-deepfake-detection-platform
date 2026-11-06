"""Hybrid deepfake detector + Grad-CAM, loaded from the exported Colab weights.

Pipeline:
    image -> ConvNeXt-Tiny (768-d)  \
                                     concat (1536-d) -> MLP head -> real/fake
    image -> CLIP ViT-L/14 (768-d)  /
Grad-CAM backprops the hybrid verdict through the ConvNeXt branch.
"""
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import matplotlib.cm as mcm
from PIL import Image
from torchvision import transforms
from transformers import CLIPImageProcessor, CLIPVisionModelWithProjection

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class HybridHead(nn.Module):
    def __init__(self, in_dim=1536, hidden=512, p=0.5):
        super().__init__()
        self.net = nn.Sequential(
            nn.LayerNorm(in_dim), nn.Linear(in_dim, hidden),
            nn.GELU(), nn.Dropout(p), nn.Linear(hidden, 2))

    def forward(self, x):
        return self.net(x)


class HybridDetector:
    def __init__(self, export_dir: Path):
        export_dir = Path(export_dir)
        cfg = json.loads((export_dir / "model_config.json").read_text())
        self.cfg = cfg
        self.classes = cfg["classes"]            # ['fake','real']
        self.img_size = cfg["img_size"]
        self.mean, self.std = cfg["mean"], cfg["std"]

        self.convnext = timm.create_model(cfg["convnext_model"], pretrained=False, num_classes=2)
        self.convnext.load_state_dict(
            torch.load(export_dir / cfg["files"]["convnext"], map_location="cpu"))
        self.convnext.reset_classifier(0)
        self.convnext.to(DEVICE).eval()

        self.clip = CLIPVisionModelWithProjection.from_pretrained(cfg["clip_model"]).to(DEVICE).eval()
        for p in self.clip.parameters():
            p.requires_grad_(False)
        self.clip_proc = CLIPImageProcessor.from_pretrained(cfg["clip_model"])

        hh = cfg["hybrid_head"]
        self.head = HybridHead(hh["in_dim"], hh["hidden"], hh["dropout"]).to(DEVICE).eval()
        self.head.load_state_dict(
            torch.load(export_dir / cfg["files"]["hybrid_head"], map_location="cpu"))

        self.cn_tf = transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.ToTensor(),
            transforms.Normalize(self.mean, self.std)])
        self.target_layer = self.convnext.stages[-1]

    def predict(self, img: Image.Image):
        """Returns dict: verdict, confidence, probs{fake,real}, gradcam (uint8 HxWx3)."""
        img = img.convert("RGB")
        x_cn = self.cn_tf(img).unsqueeze(0).to(DEVICE)
        clip_in = self.clip_proc(images=img, return_tensors="pt").to(DEVICE)

        store = {}
        h1 = self.target_layer.register_forward_hook(lambda m, i, o: store.__setitem__("A", o))
        h2 = self.target_layer.register_full_backward_hook(lambda m, gi, go: store.__setitem__("G", go[0].detach()))

        with torch.no_grad():
            clip_feat = self.clip(**clip_in).image_embeds.float()
        cn_feat = self.convnext(x_cn).float()
        fused = torch.cat([cn_feat, clip_feat], dim=1)
        logits = self.head(fused)
        probs = F.softmax(logits, dim=1)[0]
        cls = int(torch.argmax(probs).item())

        self.convnext.zero_grad(set_to_none=True)
        self.head.zero_grad(set_to_none=True)
        logits[0, cls].backward()

        A, G = store["A"], store["G"]
        w = G.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((w * A).sum(1, keepdim=True))
        cam = F.interpolate(cam, size=(self.img_size, self.img_size), mode="bilinear", align_corners=False)[0, 0]
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = cam.detach().cpu().numpy()
        h1.remove(); h2.remove()

        base = np.asarray(img.resize((self.img_size, self.img_size))).astype(np.float32) / 255.0
        heat = mcm.jet(cam)[..., :3]
        overlay = np.clip(0.55 * base + 0.45 * heat, 0, 1)

        return {
            "verdict": self.classes[cls],
            "confidence": float(probs[cls]),
            "probs": {self.classes[i]: float(probs[i]) for i in range(2)},
            "gradcam": (overlay * 255).astype(np.uint8),
        }
