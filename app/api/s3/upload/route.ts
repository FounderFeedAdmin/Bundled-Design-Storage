import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: NextRequest) {
  try {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucketName,
      fileName,
      fileType,
    } = await request.json();

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !region ||
      !bucketName ||
      !fileName ||
      !fileType
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

    // Create a presigned URL for secure upload
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // 1 hour expiry

    return NextResponse.json({
      presignedUrl,
      message: "Presigned URL generated successfully",
    });
  } catch (error: any) {
    console.error("Presigned URL generation error:", error);

    let errorMessage = "Failed to generate upload URL";
    if (error.name === "NoSuchBucket") {
      errorMessage = "Bucket does not exist";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check your credentials and permissions";
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
