import React, { useState } from 'react';
import { ShoppingBag, Tag, Search, MapPin, Plus, ArrowLeft, Send, MessageSquare, Info, Image } from 'lucide-react';
import { MarketplaceItem, User } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface MarketplaceProps {
  items: MarketplaceItem[];
  currentUser: User;
  users: User[];
  onAddItem: (title: string, price: number, description: string, category: string, image: string, location: string) => void;
  onContactSeller: (sellerId: string, sellerName: string, sellerAvatar: string, initialProductMessage?: string) => void;
  onViewProfile?: (userId: string) => void;
}

export default function Marketplace({
  items,
  currentUser,
  users,
  onAddItem,
  onContactSeller,
  onViewProfile
}: MarketplaceProps) {
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);

  // Form states for new item
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Clothing & Fashion');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const categories = ['All', 'Clothing & Fashion', 'Electronics', 'Books & Education', 'Home & Living', 'Others'];

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !price || !location.trim() || !description.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please provide a valid price.');
      return;
    }

    const demoProductPhotos = [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=450&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&h=450&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&h=450&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&h=450&q=80',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=600&h=450&q=80'
    ];

    let finalImage = selectedImages.length > 0 ? selectedImages[0] : '';
    if (!finalImage) {
      finalImage = demoProductPhotos[Math.floor(Math.random() * demoProductPhotos.length)];
    }

    onAddItem(title.trim(), priceNum, description.trim(), category, finalImage, location.trim());
    
    // Reset Form
    setTitle('');
    setPrice('');
    setCategory('Clothing & Fashion');
    setSelectedImages([]);
    setLocation('');
    setDescription('');
    setShowSellModal(false);

    alert('Your marketplace product listing has been successfully published!');
  };

  const handleMessageSeller = (item: MarketplaceItem) => {
    setSelectedProduct(null);
    const textMsg = `Salam ${item.sellerName}, is your listed item "${item.title}" still available? I am interested in purchasing it.`;
    onContactSeller(item.sellerId, item.sellerName, item.sellerAvatar, textMsg);
  };

  // Filter products
  const filteredProducts = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-1 sm:px-4 pb-20 select-none">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 transition">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-5.5 h-5.5 text-[#1877F2]" /> Rohingya Marketplace
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Explore clothing, books, and goods listed locally by fellow community members.</p>
          </div>

          <button
            onClick={() => setShowSellModal(true)}
            className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#1877F2]/10 cursor-pointer transition"
          >
            <Plus className="w-4.5 h-4.5" /> List New Item
          </button>
        </div>

        {/* SEARCH AND CATEGORY FILTER */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search marketplace listings..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-[#1877F2]"
            />
          </div>

          {/* Categories select row */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${activeCategory === cat ? 'bg-[#1877F2] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* PRODUCTS GRID */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Try resetting your filters or exploring different categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => setSelectedProduct(prod)}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:scale-101 transition-all duration-200"
            >
              
              {/* Product Thumbnail */}
              <div className="w-full aspect-[4/3] bg-slate-100 overflow-hidden relative">
                <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <span className="absolute top-2.5 right-2.5 bg-[#1877F2] text-white font-bold text-xs px-2 py-0.5 rounded-lg shadow">
                  ${prod.price}
                </span>
              </div>

              {/* Product Info Summary */}
              <div className="p-3">
                <h4 className="text-xs font-bold text-slate-800 truncate" title={prod.title}>
                  {prod.title}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span className="truncate">{prod.location}</span>
                </p>
                
                {/* Seller Quick Info Tag */}
                <div 
                  className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 cursor-pointer hover:opacity-85 transition"
                  onClick={() => onViewProfile && onViewProfile(prod.sellerId)}
                >
                  <img src={prod.sellerAvatar} alt={prod.sellerName} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <span className="text-[10px] text-slate-500 truncate">@{prod.sellerName.split(' ')[0]}</span>
                  {users.find(u => u.id === prod.sellerId)?.isVerified && <BlueVerifiedTick className="w-2.5 h-2.5 shrink-0" />}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* PRODUCT DETAILS DIALOG */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-800">
            
            <div className="relative aspect-video w-full bg-slate-900">
              <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 left-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 right-3 bg-[#1877F2] text-white font-bold text-sm px-3 py-1 rounded-lg shadow-lg">
                ${selectedProduct.price}
              </div>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#1877F2]">{selectedProduct.category}</span>
                  <h3 className="text-base font-bold text-slate-800 mt-0.5">{selectedProduct.title}</h3>
                </div>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                <MapPin className="w-4 h-4 text-[#1877F2]" />
                <span>{selectedProduct.location}</span>
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Product Description</h5>
                <p className="text-xs text-slate-700 leading-relaxed font-light">
                  {selectedProduct.description}
                </p>
              </div>

              {/* Seller details card */}
              <div className="flex items-center justify-between p-3 bg-slate-100/50 rounded-xl mb-5">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition"
                  onClick={() => {
                    setSelectedProduct(null);
                    onViewProfile && onViewProfile(selectedProduct.sellerId);
                  }}
                  title={`View ${selectedProduct.sellerName}'s Profile`}
                >
                  <img src={selectedProduct.sellerAvatar} alt={selectedProduct.sellerName} className="w-9 h-9 rounded-full object-cover border" referrerPolicy="no-referrer" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Listed by</span>
                      {users.find(u => u.id === selectedProduct.sellerId)?.isVerified && <BlueVerifiedTick className="w-2.5 h-2.5 shrink-0" />}
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 hover:underline">{selectedProduct.sellerName}</h5>
                  </div>
                </div>

                {selectedProduct.sellerId !== currentUser.id && (
                  <button
                    onClick={() => handleMessageSeller(selectedProduct)}
                    className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Seller</span>
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full bg-[#E4E6EB] text-[#050505] hover:bg-[#E4E6EB]/85 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Close Details
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* SELL NEW PRODUCT MODAL */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5.5 h-5.5 text-[#1877F2]" /> Create Market Listing
              </h3>
              <button 
                onClick={() => setShowSellModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <p className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] p-2.5 rounded-lg mb-4 font-semibold">
                {error}
              </p>
            )}

            <form onSubmit={handleCreateListing} className="space-y-4">
              
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Item Title / Name *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Handmade Tapestry"
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1877F2]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Price (USD) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1877F2]"
                  >
                    {categories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Cox's Bazar, Block 1"
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Product Photos *</label>
                
                {/* Drag-and-drop / Click-to-upload zone */}
                <div 
                  onClick={() => document.getElementById('marketplace-file-input')?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#1877F2] rounded-xl p-4 text-center cursor-pointer bg-slate-50 transition"
                >
                  <input
                    id="marketplace-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach((file: File) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setSelectedImages(prev => [...prev, reader.result as string]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                  <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Click to upload product photos</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports multiple image uploads</p>
                </div>

                {/* Thumbnail Previews with individual remove buttons */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <img src={imgUrl} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-red-600/95 hover:bg-red-700 text-white p-0.5 rounded-full shadow transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Item Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify material details, condition, pick-up hours, etc."
                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1877F2]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="w-1/2 bg-[#E4E6EB] text-[#050505] hover:bg-[#E4E6EB]/85 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#1877F2] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[#1877F2]/15 cursor-pointer"
                >
                  Publish Listing
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
