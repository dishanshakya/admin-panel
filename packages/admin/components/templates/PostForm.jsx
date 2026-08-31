"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApi, useGet } from "../../contexts/ApiContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { isUuid, removeEmptyFields, slugify } from "../../utils/utils.js";
import { getRuntimeConfig } from "../../lib/runtime.config.js";
import { ChevronDown, Eye, Loader2, Plus } from "lucide-react";

import { articleSchema, newsArticleSchema } from "../../lib/jsonld.js";
import { Textarea } from "../atoms/Input.jsx";
import { Form } from "../molecules/Form.jsx";
import { ImageUploader } from "./ImageUploader.jsx";
import { InputFields } from "../molecules/InputFields.jsx";
import { DateTime } from "../organisms/DateTime.jsx";
import ArticleEditor from "../organisms/BlockNote.jsx";
import { SchemaEditor } from "../organisms/SchemaEditor.jsx";

const publishroles = ["admin", "editor", "junior_editor"];

function canPublish(role) {
  if (!role) return false;
  return publishroles.includes(role);
}

export function PostForm({ defaults = null, onSubmit }) {
  const isEdit = defaults ? true : false;
  const rteRef = useRef(null);
  const { post, patch } = useApi();
  const { user } = useAuth();
  const toast = useToast();
  const { apiBaseUrl, host } = getRuntimeConfig();
  const siteUrl = host; // the public site URL used to build canonical post links for JSON-LD

  const [slug, setSlug] = useState(defaults?.slug ?? "");
  const [tags, setTags] = useState(defaults?.tags ? defaults.tags.split(",") : []);
  const [saveAction, setSaveAction] = useState(defaults?.status ?? "draft");
  const [saveDrop, setSaveDrop] = useState(false);

  // --- controlled fields needed for live JSON-LD schema generation ---
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [excerpt, setExcerpt] = useState(defaults?.metaDescription ?? defaults?.excerpt ?? "");
  const [ogDescription, setOgDescription] = useState(defaults?.ogDescription ?? defaults?.og_description ?? "");
  const [contentType, setContentType] = useState(defaults?.content_type ?? "news");
  const [authorId, setAuthorId] = useState(defaults?.authorId ?? defaults?.author_id ?? "");
  const [authorUrl, setAuthorUrl] = useState(defaults?.authorUrl ?? defaults?.author_url ?? "");

  const [activeTab, setActiveTab] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState(defaults?.thumbnail_url ?? null);
  const [thumbnailId, setThumbnailId] = useState(defaults?.thumbnail ?? null);
  const [coverPreview, setCoverPreview] = useState(defaults?.cover_image_url ?? null);
  const [ogPreview, setOgPreview] = useState(defaults?.og_image_url ?? null);

  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!defaults) return;
    setSlug(defaults?.slug ?? "");
    setTags(defaults?.tags ? defaults.tags.split(",") : []);
    setTitle(defaults?.title ?? "");
    setExcerpt(defaults?.metaDescription ?? defaults?.excerpt ?? "");
    setOgDescription(defaults?.ogDescription ?? defaults?.og_description ?? "");
    setContentType(defaults?.content_type ?? "news");
    setAuthorId(defaults?.authorId ?? defaults?.author_id ?? "");
    setAuthorUrl(defaults?.authorUrl ?? defaults?.author_url ?? "");
    setThumbnailPreview(defaults?.thumbnail_url ?? null);
    setThumbnailId(defaults?.thumbnail ?? null);
    setCoverPreview(defaults?.cover_image_url ?? null);
    setOgPreview(defaults?.og_image_url ?? null);
    setSaveAction(defaults?.status ?? "draft");
  }, [defaults]);

  const schemaDescription = ogDescription.trim() || excerpt;

  const schemaImages = useMemo(() => {
    const candidates = [ogPreview, coverPreview, thumbnailPreview];
    const seen = new Set();
    const images = [];
    for (const url of candidates) {
      if (url && !seen.has(url) && !url.startsWith("blob:")) {
        seen.add(url);
        images.push(url);
      }
    }
    return images;
  }, [ogPreview, coverPreview, thumbnailPreview]);

  const schema = useMemo(() => {
    const postUrl = slug ? `${siteUrl}/${contentType}/${slug}` : siteUrl;

    const shared = {
      url: postUrl,
      title,
      excerpt: schemaDescription,
      publishedAt: defaults?.published_at ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (contentType === "article") {
      return articleSchema({ ...shared, imageUrl: schemaImages[0] ?? null });
    }

    return newsArticleSchema({ ...shared, images: schemaImages });
  }, [
    contentType,
    slug,
    schemaImages,
    title,
    schemaDescription,
    defaults,
    siteUrl,
  ]);

  const handleSubmit = async (formDataValues) => {
    // 1. Extract rich text HTML content from ArticleEditor ref
    const content = (await rteRef.current?.getHtml()) ?? "";

    if (!title?.trim()) {
      toast.error("Please enter a blog title.");
      return;
    }

    if (!content?.trim()) {
      toast.error("Please enter content for the blog.");
      return;
    }

    // 2. Map form fields to backend camelCase schema
    const resolvedStatus = formDataValues.action || saveAction || "draft";
    const selectedThumbnail =
      thumbnailId ||
      (isUuid(formDataValues.thumbnail_id)
        ? formDataValues.thumbnail_id
        : isUuid(formDataValues.thumbnail)
          ? formDataValues.thumbnail
          : undefined);

    const rawPayload = {
      title: title.trim(),
      content: content.trim(),
      status: resolvedStatus === "published" ? "published" : "draft",
      metaTitle: formDataValues.meta_title || undefined,
      metaDescription: formDataValues.meta_description || excerpt || undefined,
      canonicalUrl: formDataValues.canonical_url || undefined,
      ogTitle: formDataValues.og_title || title || undefined,
      ogDescription: ogDescription || excerpt || undefined,
      redirectUrl: formDataValues.redirect_url || undefined,
      thumbnail: selectedThumbnail,
      schema: schema ? JSON.stringify(schema) : undefined,
    };

    // 3. Strip all empty strings ('') and null/undefined values
    const cleanPayload = removeEmptyFields(rawPayload);

    setLoading(true);

    try {
      const url = isEdit ? `/blogs/${defaults?.id}` : `/blogs`;
      const res = isEdit ?
        await patch(url, cleanPayload, {
          success: (res) => {
            toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
            setFormKey((prev) => prev + 1);
            onSubmit?.(res);
        } })
        :
        await post(url, cleanPayload, {
          success: (res) => {
            toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
            setFormKey((prev) => prev + 1);
            onSubmit?.(res);
        } })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to save blog. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[85vh] flex-col overflow-hidden rounded-sm mt-6 p-4 bg-white font-sans text-gray-900">
      <Form
        key={defaults?.id ?? `new-${formKey}`}
        defaults={defaults ?? {}}
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        {/* Top Action Bar */}
        <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              Status:{" "}
              <strong className="font-medium text-gray-900 capitalize">
                {defaults?.status || "Draft"}
              </strong>
            </span>
            <span className="hidden lg:inline">Last saved 3hr ago</span>
            {defaults?.published_at && (
              <span className="hidden xl:inline">
                Created: {new Date(defaults.published_at).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {defaults && (
              <button
                type="submit"
                name="action"
                value="preview"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <Eye size={18} /> Preview
              </button>
            )}

            <div className="relative inline-flex rounded-lg shadow-sm">
              <button
                type="submit"
                name="action"
                value={saveAction}
                disabled={loading}
                className="relative inline-flex items-center rounded-l-lg bg-black px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black/80 focus:z-10 focus:outline-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveAction === "draft" ? (
                  "Save Draft"
                ) : saveAction === "published" ? (
                  "Publish"
                ) : (
                  "Submit"
                )}
              </button>
              <button
                type="button"
                onClick={() => setSaveDrop(!saveDrop)}
                className="relative -ml-px inline-flex items-center rounded-r-lg border-l border-gray-100 bg-black px-2 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black/80 focus:z-10 focus:outline-none"
              >
                <ChevronDown
                  size={16}
                  className={saveDrop ? "rotate-180 transition-transform" : "transition-transform"}
                />
              </button>

              {saveDrop && (
                <div className="ring-opacity-5 absolute top-full right-0 z-10 mt-1 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSaveAction(canPublish(user?.role) ? "published" : "pending");
                        setSaveDrop(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {canPublish(user?.role) ? "Publish" : "Submit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveAction("draft");
                        setSaveDrop(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Save Draft
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Editor Area (Left) */}
          <div className="flex-1 overflow-y-auto scrollbar-none scroll-smooth bg-white">
            <div className="mx-auto w-full max-w-[840px] px-8 py-12 lg:px-12">
              <textarea
                name="title"
                placeholder="Add title"
                className="w-full resize-none border-none bg-transparent p-0 font-serif text-5xl leading-tight font-bold text-gray-900 placeholder-gray-300 focus:border-none focus:ring-0 focus:outline-none"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                rows={1}
                style={{ overflow: "hidden" }}
                required
              />

              <div className="mt-8 min-h-[400px]">
                <ArticleEditor ref={rteRef} initialHTML={defaults?.content} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex w-[350px] shrink-0 flex-col border-l border-gray-200 bg-white">
            {/* Sidebar Tabs */}
            <div className="flex shrink-0 border-b border-gray-200 px-2 pt-2">
              {["Post", "Meta", "SEO"].map((tab, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`flex-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === index
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sidebar Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {activeTab === 0 && (
                <div className="flex flex-col divide-y divide-gray-100">
                  <div className="flex flex-col gap-4 p-4">
                    <h3 className="text-xs font-semibold tracking-wider text-gray-900 uppercase">
                      Status & Visibility
                    </h3>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700"></label>
                      <DateTime name="published_at" defaultValue={defaults?.published_at} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-4">
                    <h3 className="text-xs font-semibold tracking-wider text-gray-900 uppercase">
                      Excerpt
                    </h3>
                    <Textarea
                      name="excerpt"
                      placeholder="Write an excerpt (optional)"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-4 p-4">
                    <h3 className="text-xs font-semibold tracking-wider text-gray-900 uppercase">
                      Article Settings
                    </h3>

                    <ImageUploader
                      name="thumbnail"
                      defaultCover={thumbnailPreview}
                      caption="Thumbnail"
                      id="thumb-image-input"
                      setCoverImage={(media) => {
                        if (media?.id) {
                          setThumbnailId(media.id);
                          setThumbnailPreview(media.url);
                        } else {
                          setThumbnailId(null);
                          setThumbnailPreview(null);
                        }
                      }}
                    />
                  </div>
                  <InputFields fields={["redirect_url"]} />
                </div>
              )}

              {activeTab === 1 && (
                <div className="flex flex-col gap-6 p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-gray-900 uppercase">
                    Meta Data
                  </h3>
                  <InputFields fields={["meta_title", "canonical_url", "meta_description:text"]} />
                </div>
              )}

              {activeTab === 2 && (
                <div className="flex flex-col gap-6 p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-gray-900 uppercase">
                    SEO Data
                  </h3>
                  <InputFields fields={["og_title"]} />
                  <Textarea
                    name="og_description"
                    placeholder="OG Description"
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">OG Image</label>
                    <div className="group relative cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50">
                      <ImageUploader
                        name="og_image_url"
                        id="og-image-uploader"
                        defaultCover={ogPreview}
                        caption="OG Image"
                        setCoverImage={(media) => {
                          if (media?.url) setOgPreview(media.url);
                          else setOgPreview(null);
                        }}
                      />
                    </div>
                  </div>

                  <SchemaEditor schema={schema} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
