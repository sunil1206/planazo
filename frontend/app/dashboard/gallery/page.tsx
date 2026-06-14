"use client";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { galleryApi, invitationApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Upload, Camera, Search, Download,
  ImageIcon, Loader2, CheckCircle2,
} from "lucide-react";

export default function GalleryPage() {
  const [selectedInvitation, setSelectedInvitation] = useState<number | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [selfieMode, setSelfieMode] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // Load invitations for selection
  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["invitations"],
    queryFn:  () => invitationApi.list() as Promise<any[]>,
  });

  // Load gallery images for selected invitation
  const { data: galleryData, refetch: refetchGallery, isLoading } = useQuery({
    queryKey: ["gallery", selectedInvitation],
    queryFn:  () =>
      selectedInvitation
        ? (galleryApi.list(selectedInvitation) as Promise<any>)
        : Promise.resolve({ results: [] }),
    enabled: !!selectedInvitation,
  });
  const images: any[] = galleryData?.results ?? [];

  // Dropzone for image upload
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedInvitation) {
        toast.error("Select an invitation first.");
        return;
      }
      setUploading(true);
      let success = 0;
      for (const file of acceptedFiles) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("website_id", String(selectedInvitation));
          await galleryApi.upload(fd);
          success++;
        } catch {
          toast.error(`Failed: ${file.name}`);
        }
      }
      setUploading(false);
      if (success > 0) {
        toast.success(`${success} photo${success > 1 ? "s" : ""} uploaded!`);
        refetchGallery();
      }
    },
    [selectedInvitation, refetchGallery]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true,
  });

  // Selfie match
  const handleSelfieMatch = async () => {
    if (!selfieFile || !selectedInvitation) return;
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const fd = new FormData();
      fd.append("selfie", selfieFile);
      fd.append("website_id", String(selectedInvitation));
      const result: any = await galleryApi.selfieMatch(fd);
      // Poll for result
      let job: any = result;
      for (let i = 0; i < 30; i++) {
        if (job.status === "DONE" || job.status === "FAILED") break;
        await new Promise((r) => setTimeout(r, 2000));
        job = await galleryApi.selfieStatus(job.id);
      }
      setMatchResult(job);
      if (job.status === "DONE") {
        toast.success(`Found ${job.matched_images?.length || 0} matching photos!`);
      } else {
        toast.error("Matching failed or timed out.");
      }
    } catch {
      toast.error("Selfie match failed.");
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload wedding photos — guests can find their own using AI selfie matching
          </p>
        </div>
        <button
          onClick={() => setSelfieMode(!selfieMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            selfieMode
              ? "bg-[#8B1A4A] text-white"
              : "border border-[#8B1A4A] text-[#8B1A4A]"
          }`}
        >
          <Camera size={16} />
          {selfieMode ? "Cancel Selfie" : "Selfie Match"}
        </button>
      </div>

      {/* Invitation Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Invitation to manage gallery
        </label>
        <select
          value={selectedInvitation ?? ""}
          onChange={(e) => setSelectedInvitation(Number(e.target.value) || null)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3
                     focus:outline-none focus:ring-2 focus:ring-[#8B1A4A]"
        >
          <option value="">— Choose invitation —</option>
          {(invitations as any[]).map((inv: any) => (
            <option key={inv.id} value={inv.id}>{inv.couple}</option>
          ))}
        </select>
      </div>

      {selectedInvitation && (
        <>
          {/* Selfie Match Panel */}
          {selfieMode && (
            <div className="bg-white rounded-2xl border border-[#8B1A4A]/20 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Camera size={18} style={{ color: "#8B1A4A" }} />
                AI Selfie Matching
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a selfie to find all photos where this person appears.
              </p>
              <div className="flex items-center gap-4">
                <label className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4
                                  cursor-pointer hover:border-[#8B1A4A] transition text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  />
                  {selfieFile ? (
                    <span className="text-sm text-green-600 flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> {selfieFile.name}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Click to choose selfie</span>
                  )}
                </label>
                <button
                  onClick={handleSelfieMatch}
                  disabled={!selfieFile || matchLoading}
                  className="px-6 py-3 rounded-xl text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  style={{ background: "#8B1A4A" }}
                >
                  {matchLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Searching…</>
                    : <><Search size={16} /> Find Photos</>}
                </button>
              </div>

              {matchResult?.status === "DONE" && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {matchResult.matched_images?.length || 0} matching photos found:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {matchResult.matched_images?.map((img: any) => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}${img.picture}`}
                          className="w-full h-24 object-cover"
                          alt=""
                        />
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}${img.picture}`}
                          download
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                     flex items-center justify-center transition"
                        >
                          <Download size={20} className="text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                        transition mb-6 ${
                          isDragActive
                            ? "border-[#8B1A4A] bg-[#8B1A4A]/5"
                            : "border-gray-200 hover:border-[#8B1A4A]/50"
                        }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3 text-[#8B1A4A]">
                <Loader2 size={32} className="animate-spin" />
                <p className="font-medium">Uploading photos…</p>
                <p className="text-sm text-gray-400">AI is processing thumbnails in background</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Upload size={32} />
                <p className="font-medium text-gray-600">
                  {isDragActive ? "Drop photos here" : "Drag & drop wedding photos here"}
                </p>
                <p className="text-sm">or click to browse · JPG, PNG, WEBP · Multiple files supported</p>
              </div>
            )}
          </div>

          {/* Gallery Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">No photos uploaded yet</p>
              <p className="text-sm mt-1">Upload the first photo above</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {images.length} photo{images.length !== 1 ? "s" : ""}
                </h3>
                <span className="text-xs text-gray-400">
                  Total downloads: {images.reduce((a: number, i: any) => a + (i.download_count || 0), 0)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {images.map((img: any) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${img.thumb_medium || img.picture}`}
                      className="w-full h-full object-cover"
                      alt={img.title || ""}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                    flex items-center justify-center gap-3 transition">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}${img.picture}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/90 p-2 rounded-lg hover:bg-white"
                        title="Download"
                      >
                        <Download size={16} className="text-gray-800" />
                      </a>
                    </div>
                    {img.download_count > 0 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs
                                      px-1.5 py-0.5 rounded-md">
                        ↓ {img.download_count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
