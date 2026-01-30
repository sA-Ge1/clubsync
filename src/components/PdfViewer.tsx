"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Download, Printer } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Match = {
  page: number;
  index: number;
};

export default function PDFViewer({ file,name }: { file: string,name:string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<{ width: number; height: number } | null>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);

  const [scale, setScale] = useState(1.2);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  const [pageInput, setPageInput] = useState("1");
  const [currentPage, setCurrentPage] = useState(1);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [zoomInput, setZoomInput] = useState("120");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const downloadPdf = async () => {
    try {
      const response = await fetch(file);
      const blob = await response.blob();
  
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
  
      a.href = url;
      a.download = name || "document.pdf";
  
      document.body.appendChild(a);
      a.click();
  
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed", err);
    }
  };
  const printPdf = async () => {
    try {
      const iframe = document.createElement("iframe");
  
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
  
      iframe.src = file;
  
      document.body.appendChild(iframe);
  
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
  
      // cleanup after print dialog closes
      const cleanup = () => {
        document.body.removeChild(iframe);
        window.removeEventListener("afterprint", cleanup);
      };
  
      window.addEventListener("afterprint", cleanup);
    } catch (err) {
      console.error("Print failed", err);
    }
  };
  
  

  useEffect(() => {
    setZoomInput(Math.round(scale * 100).toString());
  }, [scale]);

  /* ---------------- Search ---------------- */

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setDebouncedQuery("");
      return;
    }

    const id = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!pdf || !debouncedQuery) {
      setMatches([]);
      setActiveMatch(0);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      const results: Match[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;

        const page = await pdf.getPage(i);
        const text = await page.getTextContent();

        text.items.forEach((item: any, idx: number) => {
          if (
            typeof item.str === "string" &&
            item.str.toLowerCase().includes(debouncedQuery.toLowerCase())
          ) {
            results.push({ page: i, index: idx });
          }
        });
      }

      if (!cancelled) {
        setMatches(results);
        setActiveMatch(0);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [pdf, debouncedQuery]);

  /* ---------------- Highlight ---------------- */

  const textRenderer = useMemo(
    () => (textItem: any) => {
      if (!debouncedQuery) return textItem.str;

      const escaped = debouncedQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      return textItem.str.replace(
        new RegExp(`(${escaped})`, "gi"),
        `<span class="pdf-find-match">$1</span>`
      );
    },
    [query]
  );

  /* ---------------- Scroll to search result ---------------- */

  useEffect(() => {
    if (!matches.length) return;

    const match = matches[activeMatch];
    const page = containerRef.current?.querySelector(
      `[data-page-number="${match.page}"]`
    );

    page?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatch, matches]);

  /* ---------------- Page jump ---------------- */

  const jumpToPage = (page: number) => {
    if (page < 1 || page > numPages) return;

    setCurrentPage(page);
    setPageInput(String(page));

    const el = containerRef.current?.querySelector(
      `[data-page-number="${page}"]`
    );

    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------------- Fit controls ---------------- */

  const fitToWidth = () => {
    const page = pageSizeRef.current;
    const container = containerRef.current;
    if (!page || !container) return;

    const padding = 32;
    const availableWidth = container.clientWidth - padding;

    setScale(availableWidth / page.width);
  };

  const fitToPage = () => {
    const page = pageSizeRef.current;
    const container = containerRef.current;
    if (!page || !container) return;

    const padding = 32;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 0;

    const availableWidth = container.clientWidth - padding;
    const availableHeight = window.innerHeight - toolbarHeight - padding;

    const scaleX = availableWidth / page.width;
    const scaleY = availableHeight / page.height;

    setScale(Math.min(scaleX, scaleY));
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);
    return () =>
      document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col h-full relative gap-3">
      {/* Top Toolbar */}
      <div
        ref={toolbarRef}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/80 backdrop-blur px-3 py-2 shadow-sm"
      >
        {/* Search */}
        <div className="relative">
          <input
            value={query}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches.length > 0) {
                setActiveMatch((i) =>
                  e.shiftKey
                    ? Math.max(0, i - 1)
                    : Math.min(matches.length - 1, i + 1)
                );
              }
            }}
            placeholder="Search in document"
            className="h-9 w-60 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Zoom group */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="h-9 px-3 hover:bg-muted"
          >
            −
          </button>

          <input
            value={zoomInput}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setZoomInput(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = Number(zoomInput);
                if (val >= 50 && val <= 300) {
                  setScale(val / 100);
                }
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={() => {
              const val = Number(zoomInput);
              if (val >= 50 && val <= 300) {
                setScale(val / 100);
              } else {
                setZoomInput(Math.round(scale * 100).toString());
              }
            }}
            className="h-9 w-14 text-center text-sm outline-none"
          />

          <span className="px-2 text-sm text-muted-foreground">%</span>

          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.1))}
            className="h-9 px-3 hover:bg-muted"
          >
            +
          </button>
        </div>

        {/* Fit controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={fitToWidth}
            className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted transition"
          >
            Fit Width
          </button>
          <button
            onClick={fitToPage}
            className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted transition"
          >
            Fit Page
          </button>
          <button
            onClick={toggleFullscreen}
            className="h-9 px-3 rounded-md border border-border hover:bg-muted"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <button
            onClick={() => {
              setScale(1.2);
              setZoomInput("120");
            }}
            className="h-9 px-3 rounded-md border border-border hover:bg-muted"
          >
            Reset
          </button>
        </div>

        {/* Page nav */}
        <div className="ml-auto flex items-center gap-2 text-sm">
        <button
        onClick={downloadPdf}
        className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted transition"
        >
        <Download className="w-5 h-5"/>
        </button>
        <button
        onClick={printPdf}
        className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted transition"
        >
        <Printer className="w-5 h-5"/>
        </button>


          <span className="text-muted-foreground">Page</span>
          <input
            type="text"
            value={pageInput}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setPageInput(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                jumpToPage(Number(pageInput));
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={() => jumpToPage(Number(pageInput))}
            className="h-9 w-14 rounded-md border border-border bg-background text-center outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-muted-foreground">/ {numPages}</span>
        </div>
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto border rounded p-4"
      >
        <Document
          file={file}
          onLoadSuccess={(doc) => {
            setPdf(doc);
            setNumPages(doc.numPages);
          }}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              data-page-number={i + 1}
              className="mb-6 flex justify-center"
            >
              <Page
                key={`${i + 1}-${debouncedQuery}`}
                pageNumber={i + 1}
                scale={scale}
                onLoadSuccess={(page) => {
                  if (!pageSizeRef.current) {
                    const viewport = page.getViewport({ scale: 1 });
                    pageSizeRef.current = {
                      width: viewport.width,
                      height: viewport.height,
                    };
                    setPageWidth(viewport.width);
                    setPageHeight(viewport.height);
                  }
                }}
                customTextRenderer={textRenderer}
                renderTextLayer
                renderAnnotationLayer
              />
            </div>
          ))}
        </Document>
      </div>

      {/* Sticky Search Navigator */}
      {(searchActive || matches.length > 0) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border shadow rounded px-3 py-2 flex gap-2 items-center z-50 text-black">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keyword"
            className="h-8 w-40 rounded-md border border-border bg-white text-black px-2 text-sm"
          />

          <span className="text-sm text-black">
            {matches.length
              ? `${activeMatch + 1} / ${matches.length}`
              : "0 results"}
          </span>

          <button
            onClick={() => setActiveMatch((i) => Math.max(0, i - 1))}
            disabled={!matches.length}
          >
            ◀
          </button>
          <button
            onClick={() =>
              setActiveMatch((i) =>
                Math.min(matches.length - 1, i + 1)
              )
            }
            disabled={!matches.length}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
