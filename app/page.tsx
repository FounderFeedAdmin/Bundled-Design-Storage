'use client';

import { useState, useEffect } from 'react';

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  cloudFrontUrl: string;
}

export default function Home() {
  const [config, setConfig] = useState<S3Config>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucketName: '',
    cloudFrontUrl: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // New file browser state
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Delete page state
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'delete'>('dashboard');
  const [itemsToDelete, setItemsToDelete] = useState<any[]>([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResults, setDeleteResults] = useState<{
    success: boolean;
    deletedItems: string[];
    failedItems: Array<{ key: string; error: string }>;
    completed: boolean;
  } | null>(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareItem, setShareItem] = useState<any>(null);
  const [shareResult, setShareResult] = useState<{
    shareUrl: string;
    fileName: string;
  } | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');



  // Upload result state for copy link feature
  const [uploadResult, setUploadResult] = useState<{
    fileName: string;
    filePath: string;
    cloudFrontUrl: string;
  } | null>(null);

  // Assets upload mode state
  const [assetsUploadMode, setAssetsUploadMode] = useState(false);
  const [isAutoDetectAssets, setIsAutoDetectAssets] = useState(true);

  useEffect(() => {
    const savedConfig = localStorage.getItem('s3-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadFiles();
    }
  }, [isConnected, currentPath]);

  // Clear selection when directory changes
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [currentPath]);

  const handleInputChange = (field: keyof S3Config, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const clearCredentials = () => {
    localStorage.removeItem('s3-config');
    setConfig({
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      bucketName: '',
      cloudFrontUrl: ''
    });
    setIsConnected(false);
    setError('');
    setCurrentPath('/');
    setFiles([]);
    setSelectedFiles(new Set());
  };

  const loadFiles = async (path: string = currentPath) => {
    setIsLoading(true);
    try {
      const prefix = path === '/' ? '' : path;
      const response = await fetch('/api/s3/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          prefix,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setFiles([...data.folders, ...data.files]);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedFiles(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(file => file.path)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleFileSelect = (filePath: string, checked: boolean) => {
    const newSelection = new Set(selectedFiles);
    if (checked) {
      newSelection.add(filePath);
    } else {
      newSelection.delete(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(part => part !== '');
    const breadcrumbs = [{ name: 'Root', path: '/' }];

    let currentFullPath = '';
    for (const part of parts) {
      currentFullPath += part + '/';
      breadcrumbs.push({ name: part, path: currentFullPath });
    }

    return breadcrumbs;
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      const folderPath = currentPath === '/'
        ? newFolderName.trim() + '/'
        : currentPath + newFolderName.trim() + '/';

      const response = await fetch('/api/s3/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          folderPath,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowNewFolderDialog(false);
        setNewFolderName('');
        loadFiles(); // Refresh the file list

        // Auto-unselect files after successful folder creation
        setSelectedFiles(new Set());
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const getFileIcon = (item: any) => {
    if (item.type === 'folder') return '📁';

    const ext = item.extension?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'xls':
      case 'xlsx':
        return '📗';
      case 'ppt':
      case 'pptx':
        return '📙';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗜️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'txt':
        return '📝';
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'cpp':
        return '💻';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files));
    }
  };

  const initiateDelete = (items?: any[]) => {
    let itemsForDeletion;

    if (items) {
      // Delete specific items
      itemsForDeletion = items;
    } else {
      // Delete selected items
      itemsForDeletion = files.filter(file => selectedFiles.has(file.path));
    }

    if (itemsForDeletion.length === 0) {
      setError('Please select items to delete');
      return;
    }

    // Navigate to delete page
    setItemsToDelete(itemsForDeletion);
    setDeleteConfirmText('');
    setDeleteResults(null);
    setCurrentPage('delete');
  };

  const confirmDelete = async () => {
    const requiredText = 'delete';
    if (deleteConfirmText.toLowerCase() !== requiredText) {
      setError(`Please type "${requiredText}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const filePaths = itemsToDelete.map(item => item.path);

      const response = await fetch('/api/s3/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          filePaths,
          deleteType: filePaths.length === 1 ? 'single' : 'bulk'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteResults({
          success: true,
          deletedItems: data.deletedItems || [],
          failedItems: data.errors || [],
          completed: true
        });
        setDeleteConfirmText('');

        // Refresh the file list in background
        loadFiles();
      } else {
        throw new Error(data.error || 'Failed to delete items');
      }
    } catch (err: any) {
      setDeleteResults({
        success: false,
        deletedItems: [],
        failedItems: [{ key: 'general', error: err.message || 'Failed to delete items' }],
        completed: true
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setCurrentPage('dashboard');
    setItemsToDelete([]);
    setDeleteConfirmText('');
    setDeleteResults(null);
    setError('');
  };

  const returnToDashboard = () => {
    setCurrentPage('dashboard');
    setItemsToDelete([]);
    setDeleteConfirmText('');
    setDeleteResults(null);
    setError('');
    setSelectedFiles(new Set());
  };

  // Helper function to download files using fetch (forces download for images)
  const downloadFileWithFetch = async (url: string, fileName: string): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      // Create blob URL and download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

      return true;
    } catch (error) {
      console.error('Fetch download failed:', error);
      return false;
    }
  };

  const handleDownload = async (items?: any[]) => {
    if (!config.cloudFrontUrl.trim()) {
      setError('CloudFront URL is required for downloading files. Please configure it in settings.');
      return;
    }

    let filesToDownload;

    if (items) {
      // Download specific items
      filesToDownload = items.filter(item => item.type === 'file');
    } else {
      // Download selected items
      filesToDownload = files.filter(file =>
        selectedFiles.has(file.path) && file.type === 'file'
      );
    }

    if (filesToDownload.length === 0) {
      setError('Please select files to download (folders cannot be downloaded)');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setError('');

    try {
      const filePaths = filesToDownload.map(file => file.path);

      const response = await fetch('/api/s3/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloudFrontUrl: config.cloudFrontUrl,
          filePaths,
          downloadType: filePaths.length === 1 ? 'single' : 'multiple'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.type === 'single') {
          // Single file download with forced download
          try {
            await downloadFileWithFetch(data.downloadUrl, data.fileName);
            setUploadStatus('File downloaded successfully!');
            setTimeout(() => setUploadStatus(''), 3000);
          } catch (err) {
            console.error('Download failed:', err);
            // Fallback to direct link
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = data.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setUploadStatus('File download initiated!');
            setTimeout(() => setUploadStatus(''), 3000);
          }
        } else {
          // Multiple files download with improved forced download handling
          let downloaded = 0;
          let failed = 0;
          const total = data.downloads.length;
          const failedFiles = [];

          setUploadStatus(`Starting download of ${total} file(s)...`);

          for (const download of data.downloads) {
            try {
              // Try fetch-based download first for better control
              const success = await downloadFileWithFetch(download.url, download.fileName);

              if (success) {
                downloaded++;
              } else {
                // Fallback to traditional method
                const link = document.createElement('a');
                link.href = download.directUrl || download.url;
                link.download = download.fileName || 'download';
                link.style.display = 'none';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                downloaded++;
              }

              // Update progress
              setDownloadProgress(((downloaded + failed) / total) * 100);
              setUploadStatus(`Downloading... ${downloaded}/${total} files completed`);

              // Longer delay between downloads to prevent browser blocking
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
              console.error(`Failed to download ${download.fileName}:`, err);
              failed++;
              failedFiles.push(download.fileName);
              setDownloadProgress(((downloaded + failed) / total) * 100);
            }
          }

          // Final status update
          if (failed > 0) {
            setError(`Downloaded ${downloaded} files successfully, ${failed} failed: ${failedFiles.join(', ')}`);
          } else {
            setUploadStatus(`Successfully downloaded all ${downloaded} file(s)!`);
            setTimeout(() => setUploadStatus(''), 5000);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to generate download links');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download files');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      // Auto-unselect files after download operation completes
      if (!items) { // Only unselect if it was a bulk download operation
        setSelectedFiles(new Set());
      }
    }
  };

  const openAllFilesInTabs = () => {
    if (!config.cloudFrontUrl.trim()) {
      setError('CloudFront URL is required for opening files. Please configure it in settings.');
      return;
    }

    const filesToOpen = files.filter(file =>
      selectedFiles.has(file.path) && file.type === 'file'
    );

    if (filesToOpen.length === 0) {
      setError('Please select files to open (folders cannot be opened)');
      return;
    }

    if (filesToOpen.length > 10) {
      const confirmOpen = confirm(
        `You're about to open ${filesToOpen.length} files in new tabs. This might be blocked by your browser. Continue?`
      );
      if (!confirmOpen) return;
    }

    const baseUrl = config.cloudFrontUrl.endsWith('/')
      ? config.cloudFrontUrl.slice(0, -1)
      : config.cloudFrontUrl;

    let opened = 0;
    let failed = 0;

    filesToOpen.forEach((file, index) => {
      try {
        const fileUrl = `${baseUrl}/${file.path}`;

        // Add a small delay between opening tabs to prevent browser blocking
        setTimeout(() => {
          try {
            const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
            if (newWindow) {
              opened++;
            } else {
              failed++;
              console.error(`Failed to open ${file.name} - popup blocked`);
            }

            // Update status after all attempts
            if (index === filesToOpen.length - 1) {
              setTimeout(() => {
                if (failed > 0) {
                  setError(`Opened ${opened} files, ${failed} blocked by popup blocker. Please allow popups for this site.`);
                } else {
                  setUploadStatus(`Successfully opened ${opened} file(s) in new tabs!`);
                  setTimeout(() => setUploadStatus(''), 3000);
                }
              }, 100);
            }
          } catch (err) {
            failed++;
            console.error(`Failed to open ${file.name}:`, err);
          }
        }, index * 200); // 200ms delay between each tab

      } catch (err) {
        failed++;
        console.error(`Failed to process ${file.name}:`, err);
      }
    });

    if (filesToOpen.length > 5) {
      setUploadStatus('Opening files in tabs... Please allow popups if prompted.');
    }

    // Auto-unselect files after opening in tabs
    setTimeout(() => {
      setSelectedFiles(new Set());
    }, 1000); // Small delay to let the operation complete
  };

  const handleShare = (item: any) => {
    if (item.type !== 'file') {
      setError('Only files can be shared (folders cannot be shared)');
      return;
    }

    if (!config.cloudFrontUrl.trim()) {
      setError('CloudFront URL is required for sharing files. Please configure it in settings.');
      return;
    }

    setShareItem(item);
    setShareResult(null);
    setShowShareDialog(true);
  };

  const generateShareLink = async () => {
    if (!shareItem) return;

    try {
      const response = await fetch('/api/s3/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloudFrontUrl: config.cloudFrontUrl,
          filePath: shareItem.path
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShareResult({
          shareUrl: data.shareUrl,
          fileName: data.fileName
        });
      } else {
        throw new Error(data.error || 'Failed to generate share link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setUploadStatus('Share link copied to clipboard!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setUploadStatus('Share link copied to clipboard!');
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const closeShareDialog = () => {
    setShowShareDialog(false);
    setShareItem(null);
    setShareResult(null);
  };

  const sortFiles = (filesToSort: any[]) => {
    return [...filesToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          // Folders first, then by size
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'date':
          // Folders first, then by date
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'type':
          // Sort by type: folders first, then by file extension
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          const extA = a.extension || '';
          const extB = b.extension || '';
          comparison = extA.localeCompare(extB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (newSortBy: 'name' | 'size' | 'date' | 'type') => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Assets upload mode helper functions
  const generateRandomNumber = () => {
    return Math.floor(Math.random() * 1000000) + Date.now();
  };

  const getFileExtension = (fileName: string) => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : '';
  };

  const generateAssetFileName = (originalFileName: string) => {
    const extension = getFileExtension(originalFileName);
    const randomNum = generateRandomNumber();
    return `asset_${randomNum}${extension}`;
  };

  const checkIfAssetNameExists = async (fileName: string, targetPath: string) => {
    try {
      const response = await fetch('/api/s3/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          prefix: targetPath === '/' ? '' : targetPath
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.files.some((file: any) => file.name === fileName);
      }
      return false;
    } catch (error) {
      console.error('Error checking asset name:', error);
      return false;
    }
  };

  const generateUniqueAssetName = async (originalFileName: string, targetPath: string, maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      const assetName = generateAssetFileName(originalFileName);
      const exists = await checkIfAssetNameExists(assetName, targetPath);
      if (!exists) {
        return assetName;
      }
    }
    // Fallback with timestamp if all attempts fail
    const extension = getFileExtension(originalFileName);
    return `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}${extension}`;
  };

  const shouldUseAssetsMode = () => {
    if (!isAutoDetectAssets) {
      return assetsUploadMode;
    }
    // Auto-detect: check if current path contains 'assets', 'template', or 'templates' folders
    const path = currentPath.toLowerCase();
    return (
      path.includes('assets') ||
      path.includes('template') ||
      path.includes('templates') ||
      path === '/assets/' ||
      path === '/template/' ||
      path === '/templates/'
    );
  };

  const handleFileUpload = async (filesToUpload: File[]) => {
    if (!filesToUpload || filesToUpload.length === 0) {
      setUploadStatus('Please select files to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('');

    try {
      let successCount = 0;
      const totalFiles = filesToUpload.length;
      const useAssetsMode = shouldUseAssetsMode();

      if (useAssetsMode) {
        setUploadStatus('Assets upload mode: Generating unique names...');
      }

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        let fileName;

        if (useAssetsMode) {
          // Generate unique asset name
          const uniqueAssetName = await generateUniqueAssetName(file.name, currentPath);
          fileName = currentPath === '/' ? uniqueAssetName : currentPath + uniqueAssetName;
          setUploadStatus(`Processing ${file.name} → ${uniqueAssetName}...`);
        } else {
          // Normal upload mode
          fileName = currentPath === '/' ? file.name : currentPath + file.name;
        }

        // Get presigned URL from our API
        const response = await fetch('/api/s3/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...config,
            fileName,
            fileType: file.type,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get upload URL');
        }

        // Upload file using presigned URL
        const uploadResponse = await fetch(data.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        successCount++;
        setUploadProgress((successCount / totalFiles) * 100);

        // Store upload result for the last uploaded file (for copy link feature)
        if (i === filesToUpload.length - 1 && config.cloudFrontUrl) {
          setUploadResult({
            fileName: file.name,
            filePath: fileName,
            cloudFrontUrl: config.cloudFrontUrl
          });
        }
      }

      const modeText = useAssetsMode ? ' with auto-generated asset names' : '';
      setUploadStatus(`Successfully uploaded ${successCount} file(s)${modeText}!`);
      loadFiles(); // Refresh the file list

      // Auto-unselect files after successful upload
      setSelectedFiles(new Set());
    } catch (err: any) {
      setUploadStatus(err.message || 'Failed to upload files');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadStatus('');
        setUploadResult(null); // Clear upload result after timeout
      }, 5000);
    }
  };

  const copyUploadedFileLink = () => {
    if (uploadResult && uploadResult.cloudFrontUrl) {
      const baseUrl = uploadResult.cloudFrontUrl.endsWith('/')
        ? uploadResult.cloudFrontUrl.slice(0, -1)
        : uploadResult.cloudFrontUrl;
      const link = `${baseUrl}/${uploadResult.filePath}`;
      navigator.clipboard.writeText(link);
      setUploadStatus('Link copied to clipboard!');
      setTimeout(() => setUploadStatus(''), 3000);
      setUploadResult(null);
    }
  };

  const connectToS3 = async () => {
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      setError('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await fetch('/api/s3/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to S3');
      }

      localStorage.setItem('s3-config', JSON.stringify(config));
      setIsConnected(true);
      setCurrentPath('/');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to S3. Please check your credentials and try again.');
      console.error('S3 connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    const breadcrumbs = getBreadcrumbs();
    const filteredFiles = files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const sortedFiles = sortFiles(filteredFiles);

    // Delete Page
    if (currentPage === 'delete') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
          {/* Header */}
          <div className="bg-gray-800/50 backdrop-blur-sm border-b border-blue-500/30">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={cancelDelete}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ← Back
                  </button>
                  <h1 className="text-xl font-bold">
                    <span className="text-red-500">🗑️ Delete Items</span>
                  </h1>
                </div>
                <button
                  onClick={clearCredentials}
                  className="flex items-center text-gray-400 hover:text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="mr-1">✕</span>
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg text-red-400">
                {error}
                <button
                  onClick={() => setError('')}
                  className="float-right text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {!deleteResults?.completed ? (
              // Confirmation Phase
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center mb-6">
                  <span className="text-red-400 text-3xl mr-4">⚠️</span>
                  <div>
                    <h2 className="text-2xl font-bold text-red-400">Confirm Deletion</h2>
                    <p className="text-gray-300 mt-1">This action cannot be undone</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">
                    Items to be deleted ({itemsToDelete.length}):
                  </h3>
                  <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {itemsToDelete.map((item, index) => (
                      <div key={index} className="flex items-center py-2 border-b border-gray-600 last:border-b-0">
                        <span className="text-blue-400 mr-3 text-lg">
                          {getFileIcon(item)}
                        </span>
                        <div className="flex-1">
                          <div className="text-white font-medium">{item.name}</div>
                          <div className="text-sm text-gray-400">
                            {item.type === 'file' && (
                              <>
                                {formatFileSize(item.size)} • {item.path}
                              </>
                            )}
                            {item.type === 'folder' && (
                              <>Folder • {item.path}</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <span className="text-red-400 text-xl mr-3 mt-0.5">⚠️</span>
                    <div>
                      <h4 className="text-red-300 font-semibold mb-2">Warning: Permanent Deletion</h4>
                      <ul className="text-red-300 text-sm space-y-1">
                        <li>• These items will be permanently deleted from your S3 bucket</li>
                        <li>• This action cannot be undone</li>
                        <li>• Any public links to these files will stop working</li>
                        <li>• You will be charged for any data transfer costs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    To confirm deletion, type <span className="font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded">"delete"</span> in the box below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type 'delete' to confirm"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none text-lg"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={cancelDelete}
                    disabled={isDeleting}
                    className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete'}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors font-semibold"
                  >
                    {isDeleting ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⟳</span>
                        Deleting...
                      </span>
                    ) : (
                      'Delete Permanently'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Results Phase
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center mb-6">
                  <span className={`text-3xl mr-4 ${deleteResults.success ? 'text-green-400' : 'text-red-400'}`}>
                    {deleteResults.success ? '✅' : '❌'}
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Deletion Results</h2>
                    <p className="text-gray-300 mt-1">
                      {deleteResults.deletedItems.length > 0
                        ? `${deleteResults.deletedItems.length} items deleted successfully`
                        : 'No items were deleted'
                      }
                      {deleteResults.failedItems.length > 0 &&
                        `, ${deleteResults.failedItems.length} failed`
                      }
                    </p>
                  </div>
                </div>

                {deleteResults.deletedItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-400 flex items-center">
                      <span className="mr-2">✅</span>
                      Successfully Deleted ({deleteResults.deletedItems.length})
                    </h3>
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {deleteResults.deletedItems.map((itemPath, index) => {
                        const item = itemsToDelete.find(i => i.path === itemPath);
                        return (
                          <div key={index} className="flex items-center py-2 text-green-300">
                            <span className="text-green-400 mr-3">✓</span>
                            <span className="mr-3">{item ? getFileIcon(item) : '📄'}</span>
                            <span>{itemPath.split('/').pop() || itemPath}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {deleteResults.failedItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center">
                      <span className="mr-2">❌</span>
                      Failed to Delete ({deleteResults.failedItems.length})
                    </h3>
                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {deleteResults.failedItems.map((failedItem, index) => {
                        const item = itemsToDelete.find(i => i.path === failedItem.key);
                        return (
                          <div key={index} className="py-2">
                            <div className="flex items-center text-red-300">
                              <span className="text-red-400 mr-3">✗</span>
                              <span className="mr-3">{item ? getFileIcon(item) : '📄'}</span>
                              <span>{failedItem.key?.split('/').pop() || failedItem.key}</span>
                            </div>
                            <div className="text-sm text-red-400 ml-8 mt-1">
                              Error: {failedItem.error}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={returnToDashboard}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Dashboard Page (existing dashboard code follows...)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border-b border-blue-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <img
                    src="/logo_bundled_design.webp"
                    alt="Bundled.design"
                    className="h-8 w-8"
                  />
                  <h1 className="text-xl font-bold">
                    <span className="text-blue-400">Bundled.design</span>{' '}
                    <span className="text-blue-300">Storage</span>
                  </h1>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {config.bucketName}
                </div>
              </div>
              <button
                onClick={clearCredentials}
                className="flex items-center text-gray-400 hover:text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="mr-1">✕</span>
                Disconnect
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-500 rounded-lg text-red-400">
              {error}
              <button
                onClick={() => setError('')}
                className="float-right text-red-300 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <div className="flex items-center text-sm text-gray-400">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  <button
                    onClick={() => navigateToFolder(crumb.path)}
                    className="hover:text-white transition-colors"
                  >
                    {crumb.name}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <span className="mx-2">/</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 w-64 text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <button className="flex items-center text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <span className="mr-1">🔽</span>
                Filter
              </button>
              {selectedFiles.size > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload()}
                    disabled={isDownloading}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <span className="mr-2">📥</span>
                    {isDownloading ? 'Downloading...' : `Download (${selectedFiles.size})`}
                  </button>
                  {selectedFiles.size > 1 && (
                    <button
                      onClick={() => openAllFilesInTabs()}
                      className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      title="Open all files in new tabs if bulk download is blocked"
                    >
                      <span className="mr-2">🔗</span>
                      Open in Tabs
                    </button>
                  )}
                  <button
                    onClick={() => initiateDelete()}
                    className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <span className="mr-2">🗑️</span>
                    Delete ({selectedFiles.size})
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <span className="mr-2">📁</span>
              New Folder
            </button>
          </div>

          {/* Assets Upload Mode Controls */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 mb-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Assets Upload Mode</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={isAutoDetectAssets}
                    onChange={(e) => setIsAutoDetectAssets(e.target.checked)}
                    className="mr-2 accent-blue-500"
                  />
                  Auto-detect assets folder
                </label>
                {!isAutoDetectAssets && (
                  <label className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={assetsUploadMode}
                      onChange={(e) => setAssetsUploadMode(e.target.checked)}
                      className="mr-2 accent-blue-500"
                    />
                    Force assets mode
                  </label>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <p>
                <span className="text-blue-400">📁 Current status:</span>
                {shouldUseAssetsMode() ? (
                  <span className="text-green-400 ml-2">✅ Assets mode active - files will be renamed to asset_[random].[ext]</span>
                ) : (
                  <span className="text-gray-300 ml-2">📝 Normal mode - original filenames preserved</span>
                )}
              </p>
              {isAutoDetectAssets && (
                <p className="text-blue-400">
                  💡 Auto-detection: Assets mode activates when uploading to folders containing "assets", "template", or "templates"
                </p>
              )}
              {shouldUseAssetsMode() && (
                <p className="text-amber-400">
                  ⚠️ Asset names are checked for uniqueness to prevent conflicts
                </p>
              )}
              {shouldUseAssetsMode() && (
                <p className="text-purple-400">
                  🔄 Example: "image.jpg" → "asset_1674532187456.jpg", "document.pdf" → "asset_1674532189123.pdf"
                </p>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`bg-gray-800/40 backdrop-blur-sm border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors shadow-lg ${dragActive
              ? 'border-blue-400 bg-blue-500/20'
              : 'border-gray-500/50 hover:border-blue-400/50'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-gray-400">
              <span className="text-2xl mb-2 block">📤</span>
              <p>{dragActive ? 'Drop files here' : 'Drop files or click to upload'}</p>
              {isUploading && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-400">Uploading... {Math.round(uploadProgress)}%</p>
                </div>
              )}
              {isDownloading && downloadProgress > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-400">Downloading... {Math.round(downloadProgress)}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 If downloads are blocked, try the "Open in Tabs" button or allow popups for this site
                  </p>
                </div>
              )}
              {uploadStatus && (
                <div className={`mt-4 p-2 rounded ${uploadStatus.includes('Successfully') || uploadStatus.includes('downloaded')
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-red-600/20 text-red-400'
                  }`}>
                  {uploadStatus}
                  {uploadResult && uploadResult.cloudFrontUrl && uploadStatus.includes('Successfully uploaded') && (
                    <button
                      onClick={copyUploadedFileLink}
                      className="ml-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                    >
                      📋 Copy Link
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              id="file-upload"
              onChange={handleFileInputChange}
            />
            <label
              htmlFor="file-upload"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              Select Files
            </label>
          </div>

          {/* File List */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg border border-blue-500/20 shadow-lg">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="mr-3 accent-blue-500"
                  />
                  <span className="text-gray-400 text-sm">
                    Select All ({sortedFiles.length} items)
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">Sort by:</span>
                  <button
                    onClick={() => handleSort('name')}
                    className={`px-2 py-1 rounded transition-colors ${sortBy === 'name'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('size')}
                    className={`px-2 py-1 rounded transition-colors ${sortBy === 'size'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('date')}
                    className={`px-2 py-1 rounded transition-colors ${sortBy === 'date'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('type')}
                    className={`px-2 py-1 rounded transition-colors ${sortBy === 'type'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>

            {/* File Items */}
            <div className="divide-y divide-gray-700">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">
                  Loading files...
                </div>
              ) : sortedFiles.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No files found
                </div>
              ) : (
                sortedFiles.map((item) => (
                  <div
                    key={item.path}
                    className="flex items-center px-4 py-3 hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(item.path)}
                      onChange={(e) => handleFileSelect(item.path, e.target.checked)}
                      className="mr-3 accent-blue-500"
                    />
                    <div className="flex items-center flex-1">
                      <span className="text-blue-400 mr-3 text-lg">
                        {getFileIcon(item)}
                      </span>
                      <div className="flex-1">
                        {item.type === 'folder' ? (
                          <button
                            onClick={() => navigateToFolder(item.path)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            {item.name}
                          </button>
                        ) : (
                          <span className="text-white">{item.name}</span>
                        )}
                        <div className="text-sm text-gray-400">
                          {item.type === 'file' && (
                            <>
                              {formatFileSize(item.size)}
                              {item.lastModified && (
                                <> • {new Date(item.lastModified).toLocaleDateString()}</>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.type === 'file' && (
                          <>
                            <button
                              onClick={() => handleDownload([item])}
                              disabled={isDownloading}
                              className="text-gray-400 hover:text-blue-400 disabled:opacity-50 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                              title="Download"
                            >
                              📥
                            </button>
                            <button
                              onClick={() => handleShare(item)}
                              className="text-gray-400 hover:text-green-400 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                              title="Share"
                            >
                              🔗
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => initiateDelete([item])}
                          className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Folder Dialog */}
          {showNewFolderDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  autoFocus
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowNewFolderDialog(false);
                      setNewFolderName('');
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createFolder}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Dialog */}
          {showShareDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md">
                <div className="flex items-center mb-4">
                  <span className="text-green-400 text-2xl mr-3">🔗</span>
                  <h3 className="text-lg font-semibold text-white">Share File</h3>
                </div>

                {shareItem && (
                  <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-3 text-lg">
                        {getFileIcon(shareItem)}
                      </span>
                      <div>
                        <div className="text-white font-medium">{shareItem.name}</div>
                        <div className="text-sm text-gray-400">
                          {formatFileSize(shareItem.size)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!shareResult ? (
                  <div>
                    <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
                      <p className="text-blue-300 text-sm">
                        <strong>🌐 CloudFront Sharing:</strong> This will generate a permanent public link using your CloudFront distribution.
                        Anyone with this link can access the file at any time.
                      </p>
                    </div>

                    <div className="bg-amber-900/20 border border-amber-600 rounded-lg p-3 mb-4">
                      <p className="text-amber-300 text-sm">
                        <strong>⚠️ Important:</strong> Make sure your file is publicly accessible through CloudFront before sharing the link.
                        The link will be permanent and won't expire.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={closeShareDialog}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={generateShareLink}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Generate Public Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Public CloudFront Link:
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={shareResult.shareUrl}
                          readOnly
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-3 py-2 text-white text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(shareResult.shareUrl)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-r-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 text-sm text-gray-400">
                      <p>Type: Permanent public link</p>
                      <p>Access: Anyone with the link</p>
                    </div>

                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-3 mb-4">
                      <p className="text-green-300 text-sm">
                        <strong>✅ Link Generated:</strong> This CloudFront link provides permanent access to your file.
                        Share it with anyone who needs access to this file.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => copyToClipboard(shareResult.shareUrl)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={closeShareDialog}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <img
              src="/logo_bundled_design.webp"
              alt="Bundled.design"
              className="h-12 w-12"
            />
            <h1 className="text-3xl font-bold text-blue-400">
              Bundled.design <span className="text-blue-300">Storage</span>
            </h1>
          </div>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-center">AWS S3 Configuration</h2>

          {error && (
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Access Key ID:</label>
              <input
                type="text"
                value={config.accessKeyId}
                onChange={(e) => handleInputChange('accessKeyId', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter your AWS Access Key ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Secret Access Key:</label>
              <input
                type="password"
                value={config.secretAccessKey}
                onChange={(e) => handleInputChange('secretAccessKey', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter your AWS Secret Access Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Region:</label>
              <select
                value={config.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="us-east-1">us-east-1</option>
                <option value="us-east-2">us-east-2</option>
                <option value="us-west-1">us-west-1</option>
                <option value="us-west-2">us-west-2</option>
                <option value="eu-west-1">eu-west-1</option>
                <option value="ap-south-1">ap-south-1</option>
                <option value="ap-southeast-1">ap-southeast-1</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bucket Name:</label>
              <input
                type="text"
                value={config.bucketName}
                onChange={(e) => handleInputChange('bucketName', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter your S3 bucket name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CloudFront URL (Optional):</label>
              <input
                type="text"
                value={config.cloudFrontUrl}
                onChange={(e) => handleInputChange('cloudFrontUrl', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="https://your-distribution.cloudfront.net"
              />
            </div>

            <button
              onClick={connectToS3}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-6"
            >
              {isConnecting ? 'Connecting...' : 'Connect to S3'}
            </button>

            <div className="text-center mt-4">
              <button
                onClick={clearCredentials}
                className="text-gray-400 hover:text-white text-sm underline"
              >
                Clear stored credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
