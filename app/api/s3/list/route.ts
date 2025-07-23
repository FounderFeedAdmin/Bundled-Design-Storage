import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucketName,
      prefix = "",
    } = await request.json();

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

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    // Process folders (CommonPrefixes)
    const folders = (response.CommonPrefixes || []).map((prefix) => ({
      name: prefix.Prefix?.replace(/\/$/, "").split("/").pop() || "",
      type: "folder",
      path: prefix.Prefix || "",
      size: 0,
      lastModified: null,
    }));

    // Process files (Contents)
    const files = (response.Contents || [])
      .filter((obj) => obj.Key !== prefix) // Exclude the prefix itself
      .map((obj) => ({
        name: obj.Key?.split("/").pop() || "",
        type: "file",
        path: obj.Key || "",
        size: obj.Size || 0,
        lastModified: obj.LastModified,
        extension: obj.Key?.split(".").pop()?.toLowerCase() || "",
      }));

    return NextResponse.json({
      folders: folders,
      files: files,
      totalItems: folders.length + files.length,
    });
  } catch (error: any) {
    console.error("List files error:", error);

    let errorMessage = "Failed to list files";
    if (error.name === "NoSuchBucket") {
      errorMessage = "Bucket does not exist";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check your credentials and permissions";
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
