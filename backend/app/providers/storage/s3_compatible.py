import io
from minio import Minio
from minio.error import S3Error
from typing import Optional
from app.config import settings

class S3StorageProvider:
    def __init__(self):
        # Strip protocol if present for minio client host
        endpoint = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
        self.client = Minio(
            endpoint=endpoint,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=False
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                # Set public read policy for storyboard assets
                policy = f'''{{
                    "Version": "2012-10-17",
                    "Statement": [
                        {{
                            "Effect": "Allow",
                            "Principal": {{"AWS": ["*"]}},
                            "Action": ["s3:GetObject"],
                            "Resource": ["arn:aws:s3:::{self.bucket_name}/*"]
                        }}
                    ]
                }}'''
                self.client.set_bucket_policy(self.bucket_name, policy)
        except Exception as e:
            # Fallback for dev environments without real S3
            print(f"Warning: S3 bucket init skipped: {e}")

    def upload_image(self, object_name: str, image_bytes: bytes, content_type: str = "image/png") -> str:
        try:
            data_stream = io.BytesIO(image_bytes)
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=data_stream,
                length=len(image_bytes),
                content_type=content_type
            )
            return f"{settings.MINIO_PUBLIC_URL}/{object_name}"
        except Exception as e:
            print(f"Storage upload fallback: {e}")
            # Return SVG placeholder data url on local error
            return f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='640' height='360' fill='%231e293b'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='20' fill='%2394a3b8' dominant-baseline='middle' text-anchor='middle'>{object_name}</text></svg>"
