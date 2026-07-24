import React, { useState, useRef, useEffect } from "react";
import { X, Crop, Pencil, Smile, Type, Check, Undo, Search } from "lucide-react";

interface MediaEditorProps {
  file: File;
  onClose: () => void;
  onDone: (editedFile: File, viewOnce: boolean) => void;
}

interface PlacedSticker {
  id: string;
  text: string;
  x: number; // percentage left (0 to 100)
  y: number; // percentage top (0 to 100)
  size: number;
}

interface PlacedText {
  id: string;
  text: string;
  x: number; // percentage left
  y: number; // percentage top
  color: string;
  fontSize: number;
}

const STICKERS = [
  {
    category: "Emoji",
    items: ["😂", "❤️", "👍", "🔥", "😍", "👏", "🙌", "🎉", "✨", "💯", "🥺", "😂", "😢", "😡", "😱", "🤔"]
  },
  {
    category: "Symbols",
    items: ["✔️", "❌", "💡", "⭐", "📍", "🔔", "❤️", "💥", "💭", "💤", "👑", "🍀", "🎨", "🎵", "📷", "💬"]
  },
  {
    category: "Food",
    items: ["🍎", "🍌", "🍓", "🍉", "🍇", "🍒", "🍑", "🍍", "🍔", "🍟", "🍕", "🌭", "🍦", "🍩", "🍪", "☕"]
  }
];

const COLORS = [
  "#ffffff", // White
  "#000000", // Black
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ec4899", // Pink
];

export default function MediaEditor({ file, onClose, onDone }: MediaEditorProps) {
  const isVideo = file.type.startsWith("video/");
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [videoError, setVideoError] = useState<boolean>(false);

  // Editor modes
  const [activeMode, setActiveMode] = useState<"none" | "crop" | "pencil" | "sticker" | "text">("none");
  const [cropRatio, setCropRatio] = useState<"free" | "1:1" | "16:9">("free");
  const [viewOnce, setViewOnce] = useState<boolean>(false);

  // Drawing state
  const [pencilColor, setPencilColor] = useState<string>("#ef4444");
  const [pencilWidth, setPencilWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawHistory, setDrawHistory] = useState<string[]>([]); // Undo history of base64 states

  // Overlays
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<{ id: string; type: "sticker" | "text" } | null>(null);

  // Sticker search & bottom sheet
  const [showStickerSheet, setShowStickerSheet] = useState<boolean>(false);
  const [stickerCategory, setStickerCategory] = useState<string>("Emoji");
  const [stickerSearch, setStickerSearch] = useState<string>("");

  // Text input state
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [inputTextColor, setInputTextColor] = useState<string>("#ffffff");

  // DOM Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setVideoError(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Adjust canvas size when image is loaded
  const handleImageLoad = () => {
    if (imageRef.current && canvasRef.current) {
      canvasRef.current.width = imageRef.current.clientWidth;
      canvasRef.current.height = imageRef.current.clientHeight;
      const ctx = canvasRef.current?.getContext?.("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      // Save initial blank state
      setDrawHistory([canvasRef.current.toDataURL()]);
    }
  };

  // Drawing mouse/touch handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeMode !== "pencil" || isVideo) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext?.("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = pencilColor;
      ctx.lineWidth = pencilWidth;
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeMode !== "pencil" || isVideo) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext?.("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = pencilColor;
      ctx.lineWidth = pencilWidth;
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawing || isVideo) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      // Save state to history
      setDrawHistory(prev => [...prev, canvasRef.current!.toDataURL()]);
    }
  };

  const undoDraw = () => {
    if (drawHistory.length <= 1 || !canvasRef.current) return;
    const previousStates = [...drawHistory];
    previousStates.pop(); // remove current state
    const prevStateData = previousStates[previousStates.length - 1];
    setDrawHistory(previousStates);

    const ctx = canvasRef.current?.getContext?.("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = prevStateData;
    }
  };

  // Sticker & Text placement
  const addSticker = (emoji: string) => {
    const newSticker: PlacedSticker = {
      id: `sticker_${Date.now()}`,
      text: emoji,
      x: 40 + Math.random() * 10,
      y: 40 + Math.random() * 10,
      size: 48,
    };
    setPlacedStickers(prev => [...prev, newSticker]);
    setShowStickerSheet(false);
    setActiveMode("none");
  };

  const addText = () => {
    if (!inputText.trim()) return;
    const newText: PlacedText = {
      id: `text_${Date.now()}`,
      text: inputText,
      x: 35 + Math.random() * 10,
      y: 45 + Math.random() * 10,
      color: inputTextColor,
      fontSize: 24,
    };
    setPlacedTexts(prev => [...prev, newText]);
    setInputText("");
    setShowTextInput(false);
    setActiveMode("none");
  };

  // Drag handlers
  const handleDragStart = (id: string, type: "sticker" | "text", e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setActiveDragItem({ id, type });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeDragItem || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate percentage coordinates
    const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    if (activeDragItem.type === "sticker") {
      setPlacedStickers(prev =>
        prev.map(item => (item.id === activeDragItem.id ? { ...item, x: xPercent, y: yPercent } : item))
      );
    } else {
      setPlacedTexts(prev =>
        prev.map(item => (item.id === activeDragItem.id ? { ...item, x: xPercent, y: yPercent } : item))
      );
    }
  };

  const handleDragEnd = () => {
    setActiveDragItem(null);
  };

  // Double click or long press deletes sticker/text
  const handleDeleteOverlayItem = (id: string, type: "sticker" | "text") => {
    if (type === "sticker") {
      setPlacedStickers(prev => prev.filter(item => item.id !== id));
    } else {
      setPlacedTexts(prev => prev.filter(item => item.id !== id));
    }
  };

  // Done handler: builds final image
  const handleSaveAndSubmit = async () => {
    if (isVideo) {
      // For video we just send original file (as we do not compile on device canvas videos)
      onDone(file, viewOnce);
      return;
    }

    if (!imageRef.current) {
      onDone(file, viewOnce);
      return;
    }

    // Create export canvas
    const exportCanvas = document.createElement("canvas");
    const originalWidth = imageRef.current.naturalWidth;
    const originalHeight = imageRef.current.naturalHeight;
    exportCanvas.width = originalWidth;
    exportCanvas.height = originalHeight;

    const ctx = exportCanvas.getContext?.("2d") || null;
    if (!ctx) {
      onDone(file, viewOnce);
      return;
    }

    // Apply crops to export if active
    let sx = 0, sy = 0, sWidth = originalWidth, sHeight = originalHeight;
    if (cropRatio === "1:1") {
      const size = Math.min(originalWidth, originalHeight);
      sx = (originalWidth - size) / 2;
      sy = (originalHeight - size) / 2;
      sWidth = size;
      sHeight = size;
      exportCanvas.width = size;
      exportCanvas.height = size;
    } else if (cropRatio === "16:9") {
      const targetHeight = originalWidth * (9 / 16);
      if (targetHeight <= originalHeight) {
        sx = 0;
        sy = (originalHeight - targetHeight) / 2;
        sWidth = originalWidth;
        sHeight = targetHeight;
      } else {
        const targetWidth = originalHeight * (16 / 9);
        sx = (originalWidth - targetWidth) / 2;
        sy = 0;
        sWidth = targetWidth;
        sHeight = originalHeight;
      }
      exportCanvas.width = sWidth;
      exportCanvas.height = sHeight;
    }

    // Draw the image onto the canvas
    ctx.drawImage(imageRef.current, sx, sy, sWidth, sHeight, 0, 0, exportCanvas.width, exportCanvas.height);

    // Scaling factor from DOM display to original dimension size
    const scaleX = exportCanvas.width / imageRef.current.clientWidth;
    const scaleY = exportCanvas.height / imageRef.current.clientHeight;

    // Draw manual pencil drawings
    if (canvasRef.current) {
      ctx.save();
      ctx.drawImage(canvasRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height, 0, 0, exportCanvas.width, exportCanvas.height);
      ctx.restore();
    }

    // Draw stickers
    placedStickers.forEach(sticker => {
      ctx.save();
      const posX = (sticker.x / 100) * imageRef.current!.clientWidth * scaleX;
      const posY = (sticker.y / 100) * imageRef.current!.clientHeight * scaleY;
      ctx.font = `${sticker.size * scaleX}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.text, posX, posY);
      ctx.restore();
    });

    // Draw texts
    placedTexts.forEach(textItem => {
      ctx.save();
      const posX = (textItem.x / 100) * imageRef.current!.clientWidth * scaleX;
      const posY = (textItem.y / 100) * imageRef.current!.clientHeight * scaleY;
      ctx.fillStyle = textItem.color;
      ctx.font = `bold ${textItem.fontSize * scaleX}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(textItem.text, posX, posY);
      ctx.restore();
    });

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], file.name, { type: "image/jpeg" });
        onDone(editedFile, viewOnce);
      } else {
        onDone(file, viewOnce);
      }
    }, "image/jpeg", 0.9);
  };

  // Sticker categories search filter
  const filteredStickers = STICKERS.find(s => s.category === stickerCategory)?.items.filter(emoji => {
    if (!stickerSearch) return true;
    return emoji.includes(stickerSearch); // Simplified local emoji filter
  }) || [];

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col justify-between select-none"
      onMouseMove={handleDragMove}
      onTouchMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchEnd={handleDragEnd}
      id="media-editor-container"
    >
      {/* 1. TOP CONTROL BAR */}
      <div className="bg-black/90 border-b border-white/10 px-4 py-3 flex items-center justify-between z-20">
        <button 
          onClick={onClose} 
          className="p-2 text-white hover:bg-white/10 rounded-full transition cursor-pointer"
          title="Discard edits"
          id="btn-media-editor-close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {!isVideo && (
            <>
              {/* Crop Aspect Ratio Toggle */}
              <button
                onClick={() => {
                  setActiveMode(activeMode === "crop" ? "none" : "crop");
                  if (cropRatio === "free") setCropRatio("1:1");
                  else if (cropRatio === "1:1") setCropRatio("16:9");
                  else setCropRatio("free");
                }}
                className={`p-2 rounded-full transition cursor-pointer ${
                  cropRatio !== "free" ? "bg-[#1877F2] text-white" : "text-white/80 hover:bg-white/10"
                }`}
                title="Crop ratios"
                id="btn-crop-ratio"
              >
                <Crop className="w-5 h-5" />
              </button>

              {/* Pencil Drawing Mode */}
              <button
                onClick={() => setActiveMode(activeMode === "pencil" ? "none" : "pencil")}
                className={`p-2 rounded-full transition cursor-pointer ${
                  activeMode === "pencil" ? "bg-[#1877F2] text-white" : "text-white/80 hover:bg-white/10"
                }`}
                title="Pencil draw"
                id="btn-pencil-draw"
              >
                <Pencil className="w-5 h-5" />
              </button>

              {/* Stickers Selector */}
              <button
                onClick={() => {
                  setActiveMode("none");
                  setShowStickerSheet(true);
                }}
                className="p-2 text-white/80 hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Add stickers"
                id="btn-sticker-select"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Text Tool */}
              <button
                onClick={() => {
                  setActiveMode("none");
                  setShowTextInput(true);
                }}
                className="p-2 text-white/80 hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Add text"
                id="btn-add-text-overlay"
              >
                <Type className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Undo action */}
          {!isVideo && drawHistory.length > 1 && (
            <button
              onClick={undoDraw}
              className="p-2 text-white/80 hover:bg-white/10 rounded-full transition cursor-pointer"
              title="Undo stroke"
              id="btn-undo-stroke"
            >
              <Undo className="w-5 h-5" />
            </button>
          )}

          {/* Save & Done */}
          <button
            onClick={handleSaveAndSubmit}
            className="flex items-center gap-1 bg-[#1877F2] text-white font-black px-4 py-1.5 rounded-full hover:bg-[#1877F2]/90 transition cursor-pointer shadow-lg ml-2"
            id="btn-editor-submit"
          >
            <Check className="w-4 h-4" /> Done
          </button>
        </div>
      </div>

      {/* 2. MAIN PREVIEW AREA */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative p-4 overflow-hidden bg-black/95"
      >
        <div 
          className={`relative max-w-full max-h-full transition-all duration-300 ${
            cropRatio === "1:1" ? "aspect-square" : cropRatio === "16:9" ? "aspect-video" : ""
          } overflow-hidden`}
        >
          {isVideo ? (
            videoError ? (
              <div className="flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-8 rounded-lg shadow-xl aspect-video max-w-full text-center">
                <span className="text-sm font-semibold">Video Failed to Load</span>
                <p className="text-xs text-slate-500 mt-1">This video format might not be supported by your browser</p>
              </div>
            ) : (
              <video 
                key={objectUrl}
                src={objectUrl} 
                className="max-w-full max-h-[70vh] rounded-lg shadow-xl"
                controls
                onError={() => setVideoError(true)}
              />
            )
          ) : (
            <div className="relative">
              <img
                ref={imageRef}
                src={objectUrl}
                alt="Media editor file preview"
                className={`max-w-full max-h-[70vh] object-contain rounded-lg transition-transform duration-200 ${
                  cropRatio === "1:1" ? "aspect-square object-cover" : cropRatio === "16:9" ? "aspect-video object-cover" : ""
                }`}
                onLoad={handleImageLoad}
              />

              {/* Pencil draw canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />

              {/* Render Placed Stickers */}
              {placedStickers.map(sticker => (
                <div
                  key={sticker.id}
                  className="absolute z-20 cursor-move text-4xl select-none group touch-none"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${sticker.size}px`,
                  }}
                  onMouseDown={(e) => handleDragStart(sticker.id, "sticker", e)}
                  onTouchStart={(e) => handleDragStart(sticker.id, "sticker", e)}
                  onDoubleClick={() => handleDeleteOverlayItem(sticker.id, "sticker")}
                >
                  {sticker.text}
                  <button
                    onClick={() => handleDeleteOverlayItem(sticker.id, "sticker")}
                    className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Render Placed Texts */}
              {placedTexts.map(textItem => (
                <div
                  key={textItem.id}
                  className="absolute z-20 cursor-move font-black select-none text-center leading-none group touch-none drop-shadow-lg"
                  style={{
                    left: `${textItem.x}%`,
                    top: `${textItem.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: textItem.color,
                    fontSize: `${textItem.fontSize}px`,
                  }}
                  onMouseDown={(e) => handleDragStart(textItem.id, "text", e)}
                  onTouchStart={(e) => handleDragStart(textItem.id, "text", e)}
                  onDoubleClick={() => handleDeleteOverlayItem(textItem.id, "text")}
                >
                  {textItem.text}
                  <button
                    onClick={() => handleDeleteOverlayItem(textItem.id, "text")}
                    className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating active pencil color indicators */}
        {activeMode === "pencil" && !isVideo && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 z-30">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setPencilColor(color)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  pencilColor === color ? "scale-125 border-white shadow-lg" : "border-white/10 hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. BOTTOM VIEW-ONCE TOGGLE CONTROLS */}
      <div className="bg-black/95 px-6 py-4 flex items-center justify-between border-t border-white/10 z-20">
        <button
          onClick={() => setViewOnce(!viewOnce)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition cursor-pointer text-xs font-black ${
            viewOnce 
              ? "bg-[#1877F2]/30 text-[#1877F2] border-[#1877F2]/50 shadow-md animate-pulse" 
              : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
          }`}
          id="btn-view-once-toggle"
        >
          <span className="w-5 h-5 bg-black/40 rounded-full flex items-center justify-center border border-white/25 text-[10px] font-black">
            ①
          </span>
          {viewOnce ? "View Once Enabled" : "Set View Once"}
        </button>

        <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest hidden sm:inline">
          Double-click any item to remove
        </span>
      </div>

      {/* 4. STICKERS AND EMOJI SELECT SHEET */}
      {showStickerSheet && (
        <div className="fixed inset-x-0 bottom-0 z-55 bg-slate-950 border-t border-white/15 rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-black text-sm uppercase tracking-wider">Select Stickers & Emojis</h4>
            <button 
              onClick={() => setShowStickerSheet(false)}
              className="p-1.5 hover:bg-white/10 rounded-full text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Sticker input */}
          <div className="relative bg-white/5 rounded-2xl flex items-center px-4 py-2.5 border border-white/10 focus-within:border-[#1877F2] transition-all">
            <Search className="w-4 h-4 text-white/40 mr-2" />
            <input
              type="text"
              placeholder="Search sticker emojis..."
              value={stickerSearch}
              onChange={(e) => setStickerSearch(e.target.value)}
              className="bg-transparent text-white text-xs outline-none w-full"
            />
          </div>

          {/* Tabs header */}
          <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-none">
            {STICKERS.map(cat => (
              <button
                key={cat.category}
                onClick={() => {
                  setStickerCategory(cat.category);
                  setStickerSearch("");
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  stickerCategory === cat.category 
                    ? "bg-[#1877F2] text-white shadow-md" 
                    : "text-white/60 hover:bg-white/5"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* Sticker contents grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-4 max-h-48 overflow-y-auto py-2 pr-1">
            {filteredStickers.map((sticker, idx) => (
              <button
                key={idx}
                onClick={() => addSticker(sticker)}
                className="text-3xl p-2 hover:bg-white/10 rounded-2xl transition hover:scale-125 cursor-pointer text-center"
              >
                {sticker}
              </button>
            ))}
            {filteredStickers.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-white/40">No matching sticker found</div>
            )}
          </div>
        </div>
      )}

      {/* 5. TEXT OVERLAY INPUT MODAL */}
      {showTextInput && (
        <div className="fixed inset-0 z-55 bg-black/90 flex flex-col justify-center px-6">
          <div className="max-w-md mx-auto w-full flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <span className="text-white font-black text-xs uppercase tracking-wider">Add text overlay</span>
              <button 
                onClick={() => setShowTextInput(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message overlay..."
              className="w-full bg-slate-900 border border-white/15 text-white p-4 rounded-2xl text-center text-lg font-black outline-none focus:border-[#1877F2] transition-all placeholder:text-white/30 h-32"
              style={{ color: inputTextColor }}
            />

            {/* Input color selection */}
            <div className="flex flex-wrap justify-center gap-2 py-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setInputTextColor(color)}
                  className={`w-7 h-7 rounded-full border transition-all ${
                    inputTextColor === color ? "scale-125 border-white shadow-lg" : "border-white/10 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <button
              onClick={addText}
              disabled={!inputText.trim()}
              className="w-full bg-[#1877F2] text-white font-black py-4 rounded-2xl hover:bg-[#1877F2]/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xl text-sm"
              id="btn-confirm-text-overlay"
            >
              Add Overlay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
