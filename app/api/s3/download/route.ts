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
      // Generate CloudFront URL for single file download
      const filePath = filePaths[0];
      const downloadUrl = `${baseUrl}/${filePath}`;

      return NextResponse.json({
        success: true,
        downloadUrl: downloadUrl,
        fileName: filePath.split("/").pop(),
        type: "single",
      });
    } else {
      // For multiple files, return individual CloudFront URLs
      const downloadUrls = [];

      for (const filePath of filePaths) {
        const downloadUrl = `${baseUrl}/${filePath}`;

        downloadUrls.push({
          path: filePath,
          fileName: filePath.split("/").pop(),
          url: downloadUrl,
        });
      }

      return NextResponse.json({
        success: true,
        downloads: downloadUrls,
        errors: [], // No errors since we're just constructing URLs
        type: "multiple",
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
