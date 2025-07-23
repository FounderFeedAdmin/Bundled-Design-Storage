import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const { accessKeyId, secretAccessKey, region, bucketName } =
      await request.json();

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return NextResponse.json(
        { error: "Missing required credentials" },
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

    // Use HeadBucket instead of ListBuckets - it's safer and tests bucket access
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

    return NextResponse.json({
      success: true,
      message: "Successfully connected to S3 bucket",
    });
  } catch (error: any) {
    console.error("S3 connection error:", error);

    let errorMessage = "Failed to connect to S3";
    if (error.name === "NoSuchBucket") {
      errorMessage = "Bucket does not exist";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check your credentials and permissions";
    } else if (error.name === "InvalidAccessKeyId") {
      errorMessage = "Invalid access key ID";
    } else if (error.name === "SignatureDoesNotMatch") {
      errorMessage = "Invalid secret access key";
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
