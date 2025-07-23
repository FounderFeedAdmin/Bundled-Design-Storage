import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const { accessKeyId, secretAccessKey, region, bucketName, folderPath } =
      await request.json();

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !region ||
      !bucketName ||
      !folderPath
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

    // Create folder by uploading an empty object with trailing slash
    const folderKey = folderPath.endsWith("/") ? folderPath : folderPath + "/";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: folderKey,
      Body: "",
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: "Folder created successfully",
      folderPath: folderKey,
    });
  } catch (error: any) {
    console.error("Create folder error:", error);

    let errorMessage = "Failed to create folder";
    if (error.name === "NoSuchBucket") {
      errorMessage = "Bucket does not exist";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check your credentials and permissions";
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
