"""
MinIO client setup using the minio Python SDK.
"""
import logging
from minio import Minio
from minio.error import S3Error
from backend.config import settings

logger = logging.getLogger(__name__)

_client: Minio | None = None


def get_minio_client() -> Minio:
    """Return a singleton MinIO client instance."""
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        logger.info(f"[minio] Client connected to {settings.MINIO_ENDPOINT}")
    return _client


def ensure_bucket_exists(bucket_name: str = None) -> None:
    """Ensure the configured bucket exists, creating it if necessary."""
    bucket = bucket_name or settings.MINIO_BUCKET
    client = get_minio_client()
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f"[minio] Created bucket: {bucket}")
        else:
            logger.debug(f"[minio] Bucket already exists: {bucket}")
    except S3Error as e:
        logger.error(f"[minio] Error ensuring bucket '{bucket}': {e}")
        raise


def upload_file(
    object_name: str,
    data: bytes,
    content_type: str = "text/plain",
    bucket_name: str = None,
) -> str:
    """
    Upload raw bytes to MinIO.

    Returns:
        The full object path (bucket/object_name).
    """
    import io

    bucket = bucket_name or settings.MINIO_BUCKET
    client = get_minio_client()
    ensure_bucket_exists(bucket)

    byte_stream = io.BytesIO(data)
    client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=byte_stream,
        length=len(data),
        content_type=content_type,
    )
    logger.info(f"[minio] Uploaded: {bucket}/{object_name} ({len(data)} bytes)")
    return f"{bucket}/{object_name}"


def download_file(object_name: str, bucket_name: str = None) -> bytes:
    """Download an object from MinIO and return its raw bytes."""
    bucket = bucket_name or settings.MINIO_BUCKET
    client = get_minio_client()
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
