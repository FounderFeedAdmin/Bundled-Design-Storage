import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { cloudFrontUrl, filePath } = await request.json();

    if (!cloudFrontUrl || !filePath) {
      return NextResponse.json(
        { error: "CloudFront URL and file path are required" },
        { status: 400 }
      );
    }

    // Remove trailing slash from CloudFront URL if present
    const baseUrl = cloudFrontUrl.replace(/\/$/, "");

    // Ensure filePath doesn't start with slash (CloudFront expects relative paths)
    const cleanFilePath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    // Construct the public CloudFront URL
    const publicUrl = `${baseUrl}/${cleanFilePath}`;

    return NextResponse.json({
      success: true,
      shareUrl: publicUrl,
      fileName: filePath.split("/").pop(),
      filePath: filePath,
      isPermanent: true,
      shareType: "cloudfront",
    });
  } catch (error: any) {
    console.error("Share API error:", error);

    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
