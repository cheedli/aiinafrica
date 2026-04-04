import io

_model = None
_processor = None

def _load_model():
    global _model, _processor
    if _model is None:
        try:
            from transformers import AutoProcessor, AutoModelForCausalLM
            import torch
            model_id = "microsoft/Florence-2-large"
            _processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
            _model = AutoModelForCausalLM.from_pretrained(
                model_id, trust_remote_code=True, torch_dtype=torch.float16
            )
            device = "cuda" if torch.cuda.is_available() else "cpu"
            _model = _model.to(device)
        except ImportError:
            return None, None
    return _model, _processor

def caption_medical_image(image_bytes: bytes) -> str:
    try:
        from PIL import Image
        import torch
        model, processor = _load_model()
        if model is None or processor is None:
            return "Medical image uploaded (Florence-2 not installed in this environment)."
        device = next(model.parameters()).device
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        prompt = "<DETAILED_CAPTION>"
        inputs = processor(text=prompt, images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            generated_ids = model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=512,
                num_beams=3,
            )
        result = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
        parsed = processor.post_process_generation(result, task=prompt, image_size=(image.width, image.height))
        return parsed.get("<DETAILED_CAPTION>", "Medical image: detailed visual content present.")
    except Exception as e:
        return f"Medical image uploaded (Florence-2 captioning unavailable: {str(e)[:100]})"
