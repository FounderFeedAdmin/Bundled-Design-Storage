import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { cloudFrontUrl, filePaths, downloadType } = await request.json();

    if (!cloudFrontUrl || !filePaths || !Array.isArray(filePaths)) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: cloudFrontUrl and filePaths are required",
        },
        { status: 400 }
      );
    }

    // Ensure CloudFront URL doesn't have trailing slash
    const baseUrl = cloudFrontUrl.endsWith("/")
      ? cloudFrontUrl.slice(0, -1)
      : cloudFrontUrl;

    if (downloadType === "single" && filePaths.length === 1) {
      // Generate CloudFront URL for single file download with download parameter
      const filePath = filePaths[0];
      const fileName = filePath.split("/").pop() || "download";
      const downloadUrl = `${baseUrl}/${filePath}?response-content-disposition=attachment%3B%20filename%3D${encodeURIComponent(
        fileName
      )}`;

      return NextResponse.json({
        success: true,
        downloadUrl: downloadUrl,
        fileName: fileName,
        type: "single",
        forceDownload: true,
      });
    } else {
      // For multiple files, return individual CloudFront URLs with additional metadata
      const downloadUrls = [];
      const errors = [];

      for (const filePath of filePaths) {
        try {
          // Validate file path
          if (!filePath || typeof filePath !== "string") {
            errors.push({ path: filePath, error: "Invalid file path" });
            continue;
          }

          const fileName = filePath.split("/").pop() || "download";
          const downloadUrl = `${baseUrl}/${filePath}?response-content-disposition=attachment%3B%20filename%3D${encodeURIComponent(
            fileName
          )}`;

          downloadUrls.push({
            path: filePath,
            fileName: fileName,
            url: downloadUrl,
            directUrl: `${baseUrl}/${filePath}`, // Keep direct URL for fallback
            // Add content disposition hint for better download handling
            contentDisposition: `attachment; filename="${fileName}"`,
            forceDownload: true,
          });
        } catch (error) {
          errors.push({
            path: filePath,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        downloads: downloadUrls,
        errors: errors,
        type: "multiple",
        totalFiles: downloadUrls.length,
        failedFiles: errors.length,
      });
    }
  } catch (error: any) {
    console.error("Download API error:", error);

    return NextResponse.json(
      { error: "Failed to generate download links" },
      { status: 400 }
    );
  }
}
