import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Navigation, 
  Check, 
  X, 
  Building2, 
  Globe
} from 'lucide-react';
import { usePostCreationStore } from './CreatePostScreen';

const DUMMY_LOCATIONS = [
  { id: 'l1', name: "Cox's Bazar, Bangladesh", category: "City • Bangladesh", icon: <Building2 className="w-4 h-4 text-rose-500" /> },
  { id: 'l2', name: "Kutupalong Refugee Camp", category: "Refugee Camp • Cox's Bazar", icon: <MapPin className="w-4 h-4 text-emerald-500" /> },
  { id: 'l3', name: "Maungdaw, Rakhine State", category: "Town • Myanmar", icon: <Building2 className="w-4 h-4 text-blue-500" /> },
  { id: 'l4', name: "Akyab (Sittwe), Myanmar", category: "City • Rakhine State", icon: <Building2 className="w-4 h-4 text-purple-500" /> },
  { id: 'l5', name: "Buthidaung, Rakhine State", category: "Town • Myanmar", icon: <MapPin className="w-4 h-4 text-amber-500" /> },
  { id: 'l6', name: "Balukhali Refugee Camp", category: "Camp • Bangladesh", icon: <MapPin className="w-4 h-4 text-teal-500" /> },
  { id: 'l7', name: "Yangon, Myanmar", category: "City • Myanmar", icon: <Building2 className="w-4 h-4 text-indigo-500" /> },
  { id: 'l8', name: "Kuala Lumpur, Malaysia", category: "Capital City • Malaysia", icon: <Globe className="w-4 h-4 text-cyan-500" /> },
  { id: 'l9', name: "Chicago, IL, USA", category: "City • United States", icon: <Building2 className="w-4 h-4 text-rose-500" /> },
  { id: 'l10', name: "New York, NY, USA", category: "City • United States", icon: <Building2 className="w-4 h-4 text-blue-500" /> },
  { id: 'l11', name: "London, United Kingdom", category: "Capital City • UK", icon: <Globe className="w-4 h-4 text-violet-500" /> },
  { id: 'l12', name: "Dhaka, Bangladesh", category: "Capital City • Bangladesh", icon: <Building2 className="w-4 h-4 text-emerald-500" /> },
  { id: 'l13', name: "Sydney, Australia", category: "City • Australia", icon: <Globe className="w-4 h-4 text-amber-500" /> },
  { id: 'l14', name: "Dubai, United Arab Emirates", category: "City • UAE", icon: <Building2 className="w-4 h-4 text-yellow-500" /> },
];

interface LocationPickerScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: any;
  };
  currentUser?: any;
  onClose?: () => void;
}

export default function LocationPickerScreen({ navigation, route, onClose }: LocationPickerScreenProps) {
  const [postState, setPostState] = usePostCreationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingGps, setLoadingGps] = useState(false);

  const handleReturnToCreatePost = (locName?: string) => {
    const targetLoc = locName !== undefined ? locName : postState.location;
    if (locName !== undefined) {
      setPostState({ location: locName });
    }
    navigation.navigate('CreatePostScreen', {
      music: postState.music || route?.params?.currentMusic,
      tagged: postState.taggedUsers || route?.params?.currentTagged,
      location: targetLoc || route?.params?.currentLocation
    });
  };

  const handleSelectLocation = (locName: string) => {
    handleReturnToCreatePost(locName);
  };

  const handleUseCurrentLocation = () => {
    setLoadingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLoadingGps(false);
          handleSelectLocation("Current Location (GPS)");
        },
        () => {
          setLoadingGps(false);
          handleSelectLocation("Cox's Bazar, Bangladesh");
        }
      );
    } else {
      setTimeout(() => {
        setLoadingGps(false);
        handleSelectLocation("Cox's Bazar, Bangladesh");
      }, 600);
    }
  };

  const displayedList = DUMMY_LOCATIONS.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleReturnToCreatePost()}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Add location</h1>
        </div>
        {postState.location && (
          <button
            onClick={() => setPostState({ location: undefined })}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 transition"
          >
            Remove
          </button>
        )}
      </div>

      {/* Top: Search bar "Search location" */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location"
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1877F2] transition placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Locations List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        
        {/* GPS Option */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={loadingGps}
          className="w-full flex items-center gap-3.5 p-3.5 mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition cursor-pointer text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition duration-200">
            <Navigation className={`w-5 h-5 ${loadingGps ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-sm block">{loadingGps ? 'Locating your GPS coordinates...' : 'Use current location (GPS)'}</span>
            <span className="text-xs text-blue-600/80 dark:text-blue-400/80 truncate block">Automatic geolocation detection</span>
          </div>
        </button>

        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
          Popular & Suggested Locations
        </div>

        {displayedList.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <span className="font-bold text-base block">No location matches found</span>
            <span className="text-xs">Try searching for a different city or region name.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedList.map((item) => {
              const isSelected = postState.location === item.name;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectLocation(item.name)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer group ${isSelected ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-750 transition">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate block">{item.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block mt-0.5">{item.category}</span>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${isSelected ? 'bg-rose-600 text-white' : 'border-2 border-slate-300 dark:border-slate-700 text-transparent'}`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
