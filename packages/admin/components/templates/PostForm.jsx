"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, Loader2, Plus } from "lucide-react";

import { useApi, useGet } from "../../contexts/ApiContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { articleSchema, newsArticleSchema } from "../../lib/jsonld.js";
import { getRuntimeConfig } from "../../lib/runtime.config.js";
import { isUuid, removeEmptyFields, slugify } from "../../utils/utils.js";
import { Textarea } from "../atoms/Input.jsx";
import { Form } from "../molecules/Form.jsx";
import { InputFields } from "../molecules/InputFields.jsx";
import ArticleEditor from "../organisms/BlockNote.jsx";
import { DateTime } from "../organisms/DateTime.jsx";
import { SchemaEditor } from "../organisms/SchemaEditor.jsx";
import { ImageUploader } from "./ImageUploader.jsx";

const publishroles = ["admin", "editor", "junior_editor"];

function canPublish(role) {
  if (!role) return false;
  return publishroles.includes(role);
}

function formatTimeAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(date).toLocaleDateString();
}

function SidebarSection({ title, children, className }) {
  return (
    <section
      className={`rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className || ""}`}
    >
      <header className="mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{title}</h3>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
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
  const [saveAction, setSaveAction] = useState(defaults?.status ?? "published");
  const [saveDrop, setSaveDrop] = useState(false);

  // --- controlled fields needed for live JSON-LD schema generation ---
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [excerpt, setExcerpt] = useState(defaults?.metaDescription ?? defaults?.excerpt ?? "");
  const [ogDescription, setOgDescription] = useState(
    defaults?.ogDescription ?? defaults?.og_description ?? "",
  );
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
    setSaveAction(defaults?.status ?? "published");
  }, [defaults]);

  const schemaDescription = ogDescription.trim() || excerpt;

  const defaultPublishedAt = defaults?.publishedAt ?? defaults?.published_at;

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
      publishedAt: defaultPublishedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (contentType === "article") {
      return articleSchema({ ...shared, imageUrl: schemaImages[0] ?? null });
    }

    return newsArticleSchema({ ...shared, images: schemaImages });
  }, [contentType, slug, schemaImages, title, schemaDescription, defaultPublishedAt, siteUrl]);

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
    const resolvedStatus = formDataValues.action || saveAction || "published";
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
      publishedAt: formDataValues.publishedAt || undefined,
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
      const res = isEdit
        ? await patch(url, cleanPayload, {
            success: (res) => {
              toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
              setFormKey((prev) => prev + 1);
              onSubmit?.(res);
            },
          })
        : await post(url, cleanPayload, {
            success: (res) => {
              toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
              setFormKey((prev) => prev + 1);
              onSubmit?.(res);
            },
          });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to save blog. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 flex h-[85vh] flex-col overflow-hidden rounded-sm bg-white p-4 font-sans text-gray-900">
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
                {defaults?.status || saveAction}
              </strong>
            </span>
            {defaults?.updatedAt && (
              <span className="hidden lg:inline">
                Last saved {formatTimeAgo(defaults.updatedAt)}
              </span>
            )}
            {defaultPublishedAt && (
              <span className="hidden xl:inline">
                Created: {new Date(defaultPublishedAt).toLocaleString()}
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
          <div className="flex-1 scrollbar-none overflow-y-auto scroll-smooth bg-white">
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
          <div className="flex w-[350px] shrink-0 flex-col border-l border-gray-200 bg-gray-50/60">
            {/* Sidebar Tabs */}
            <div className="flex shrink-0 gap-1 border-b border-gray-200 bg-white px-3 pt-3">
              {["Post", "Meta", "SEO"].map((tab, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`relative flex-1 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === index ? "text-gray-900" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {tab}
                  {activeTab === index && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gray-900" />
                  )}
                </button>
              ))}
            </div>

            {/* Sidebar Scrollable Content */}
            <div className="flex-1 scrollbar-none space-y-4 overflow-y-auto p-4">
              {activeTab === 0 && (
                <>
                  <SidebarSection title="Status & Visibility">
                    <DateTime name="publishedAt" defaultValue={defaultPublishedAt} />
                  </SidebarSection>

                  <SidebarSection title="Article Settings">
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
                  </SidebarSection>
                </>
              )}

              {activeTab === 1 && (
                <>
                  <SidebarSection title="Search Result">
                    <InputFields fields={["meta_title", "meta_description:text"]} />
                  </SidebarSection>

                  <SidebarSection title="Canonical URL">
                    <InputFields fields={["canonical_url"]} />
                  </SidebarSection>
                </>
              )}

              {activeTab === 2 && (
                <>
                  <SidebarSection title="Social Sharing">
                    <InputFields fields={["og_title"]} />
                    <Textarea
                      name="og_description"
                      placeholder="OG description (optional)"
                      value={ogDescription}
                      onChange={(e) => setOgDescription(e.target.value)}
                    />
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
                  </SidebarSection>

                  <SidebarSection title="Structured Data">
                    <SchemaEditor schema={schema} />
                  </SidebarSection>
                </>
              )}
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
