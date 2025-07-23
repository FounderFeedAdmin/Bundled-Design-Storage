import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

export async function DELETE(request: NextRequest) {
  try {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucketName,
      filePaths,
      deleteType,
    } = await request.json();

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !region ||
      !bucketName ||
      !filePaths ||
      !Array.isArray(filePaths)
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

    let deletedItems: string[] = [];
    let errors: Array<{ key: string; error: string; code?: string }> = [];

    // Helper function to get all objects in a folder (for recursive deletion)
    const getAllObjectsInFolder = async (
      folderPath: string
    ): Promise<string[]> => {
      const objects: string[] = [];
      let continuationToken: string | undefined = undefined;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: folderPath.endsWith("/") ? folderPath : folderPath + "/",
          ContinuationToken: continuationToken,
        });

        const response: ListObjectsV2CommandOutput = await s3Client.send(
          listCommand
        );

        if (response.Contents) {
          objects.push(
            ...response.Contents.map((obj: any) => obj.Key).filter(Boolean)
          );
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return objects;
    };

    // Expand folder paths to include all contained objects
    let allObjectsToDelete = [];

    for (const path of filePaths) {
      if (path.endsWith("/") || (path.includes("/") && !path.includes("."))) {
        // This appears to be a folder, get all objects within it
        try {
          const folderContents = await getAllObjectsInFolder(path);
          allObjectsToDelete.push(...folderContents);
          // Also add the folder itself if it exists as an object
          allObjectsToDelete.push(path.endsWith("/") ? path : path + "/");
        } catch (error: any) {
          console.error(`Error listing folder contents for ${path}:`, error);
          errors.push({
            key: path,
            error: `Failed to list folder contents: ${error.message}`,
          });
        }
      } else {
        // Regular file
        allObjectsToDelete.push(path);
      }
    }

    // Remove duplicates
    allObjectsToDelete = [...new Set(allObjectsToDelete)];

    if (allObjectsToDelete.length === 0) {
      return NextResponse.json(
        { error: "No objects found to delete" },
        { status: 400 }
      );
    }

    if (allObjectsToDelete.length === 1) {
      // Single file deletion
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: allObjectsToDelete[0],
        });

        await s3Client.send(command);
        deletedItems.push(allObjectsToDelete[0]);
      } catch (error: any) {
        errors.push({ key: allObjectsToDelete[0], error: error.message });
      }
    } else {
      // Bulk deletion - S3 allows up to 1000 objects per request
      const batchSize = 1000;

      for (let i = 0; i < allObjectsToDelete.length; i += batchSize) {
        const batch = allObjectsToDelete.slice(i, i + batchSize);

        try {
          const objects = batch.map((path) => ({ Key: path }));

          const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: objects,
              Quiet: false,
            },
          });

          const response = await s3Client.send(command);

          // Process successful deletions
          if (response.Deleted) {
            const batchDeleted = response.Deleted.map(
              (item) => item.Key
            ).filter((key): key is string => Boolean(key));
            deletedItems.push(...batchDeleted);
          }

          // Process errors
          if (response.Errors) {
            const batchErrors = response.Errors.map((error) => ({
              key: error.Key || "unknown",
              error: error.Message || "Unknown error",
              code: error.Code,
            })).filter((item) => item.key !== "unknown");
            errors.push(...batchErrors);
          }
        } catch (error: any) {
          // If batch fails, try individual deletions
          for (const objectKey of batch) {
            try {
              const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
              });

              await s3Client.send(command);
              deletedItems.push(objectKey);
            } catch (individualError: any) {
              errors.push({ key: objectKey, error: individualError.message });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedItems,
      errors,
      message: `Successfully deleted ${deletedItems.length} item(s)${
        errors.length > 0 ? ` with ${errors.length} error(s)` : ""
      }`,
    });
  } catch (error: any) {
    console.error("Delete files error:", error);

    let errorMessage = "Failed to delete files";
    if (error.name === "NoSuchBucket") {
      errorMessage = "Bucket does not exist";
    } else if (error.name === "AccessDenied") {
      errorMessage = "Access denied - check your credentials and permissions";
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
