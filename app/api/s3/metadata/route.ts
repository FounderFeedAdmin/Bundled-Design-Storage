import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const { accessKeyId, secretAccessKey, region, bucketName, filePath } =
      await request.json();

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !region ||
      !bucketName ||
      !filePath
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: filePath,
      });

      const response = await s3Client.send(command);

      // Extract useful metadata
      const metadata = {
        // Basic file info
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag?.replace(/"/g, ""), // Remove quotes

        // S3 specific metadata
        storageClass: response.StorageClass || "STANDARD",
        versionId: response.VersionId,

        // Cache and encoding info
        cacheControl: response.CacheControl,
        contentDisposition: response.ContentDisposition,
        contentEncoding: response.ContentEncoding,
        contentLanguage: response.ContentLanguage,

        // Custom metadata (user-defined)
        userMetadata: response.Metadata || {},

        // Server info
        serverSideEncryption: response.ServerSideEncryption,
        checksumSHA256: response.ChecksumSHA256,

        // Additional computed info
        fileName: filePath.split("/").pop(),
        fileExtension: filePath.split(".").pop()?.toLowerCase(),

        // Calculate human-readable size
        humanSize: formatBytes(response.ContentLength || 0),

        // Check if it's an image
        isImage: isImageFile(response.ContentType || ""),
      };

      return NextResponse.json({
        success: true,
        metadata,
        filePath,
      });
    } catch (error: any) {
      console.error("Metadata fetch error:", error);

      let errorMessage = "Failed to fetch metadata";
      if (error.name === "NoSuchKey") {
        errorMessage = "File not found";
      } else if (error.name === "AccessDenied") {
        errorMessage = "Access denied - check your permissions";
      }

      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
  } catch (error: any) {
    console.error("Metadata API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper function to check if file is an image
function isImageFile(contentType: string) {
  return contentType.startsWith("image/");
}
