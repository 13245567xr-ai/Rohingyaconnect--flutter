import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Eye, HelpCircle, ChevronRight, PieChart, Sparkles, Filter, Calendar } from 'lucide-react';
import { User } from '../types';

interface CreatorDashboardProps {
  currentUser: User;
}

export default function CreatorDashboard({ currentUser }: CreatorDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  
  // Views breakdown filter states
  const [viewsTypeFilter, setViewsTypeFilter] = useState<'all' | 'organic' | 'shared'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'image' | 'text'>('all');
  const [viewTypeFilter, setViewTypeFilter] = useState<'all' | 'unique' | 'repeat'>('all');

  // Interactive data based on filter combinations
  const getFilteredViewsData = () => {
    // Return sample interactive dataset for the customized filters
    let baseViews = 12450;
    if (timeRange === '7d') baseViews = 2840;
    if (timeRange === 'all') baseViews = 94820;

    // Apply multipliers based on selected filters
    let multiplier = 1;
    if (viewsTypeFilter === 'organic') multiplier *= 0.65;
    if (viewsTypeFilter === 'shared') multiplier *= 0.35;
    if (mediaTypeFilter === 'video') multiplier *= 0.50;
    if (mediaTypeFilter === 'image') multiplier *= 0.35;
    if (mediaTypeFilter === 'text') multiplier *= 0.15;
    if (viewTypeFilter === 'unique') multiplier *= 0.70;
    if (viewTypeFilter === 'repeat') multiplier *= 0.30;

    const views = Math.round(baseViews * multiplier);
    const uniqueUsers = Math.round(views * 0.7);
    const repeatRatio = Math.round((views - uniqueUsers) / views * 100) || 30;

    return {
      views,
      uniqueUsers,
      repeatRatio,
      engagementRate: (8.4 * multiplier).toFixed(1),
      viewsTimeline: [
        { label: 'Mon', value: Math.round(400 * multiplier) },
        { label: 'Tue', value: Math.round(550 * multiplier) },
        { label: 'Wed', value: Math.round(420 * multiplier) },
        { label: 'Thu', value: Math.round(710 * multiplier) },
        { label: 'Fri', value: Math.round(680 * multiplier) },
        { label: 'Sat', value: Math.round(920 * multiplier) },
        { label: 'Sun', value: Math.round(850 * multiplier) },
      ]
    };
  };

  const data = getFilteredViewsData();

  // Audience demographics & Insights
  const demographics = [
    { region: 'Cox\'s Bazar Camps', percentage: 58, count: '32.1k' },
    { region: 'Sittwe / Rakhine State', percentage: 22, count: '12.2k' },
    { region: 'Kuala Lumpur', percentage: 11, count: '6.1k' },
    { region: 'Riyadh / Saudi Arabia', percentage: 6, count: '3.3k' },
    { region: 'Other Diaspora', percentage: 3, count: '1.6k' },
  ];

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 rounded-3xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold tracking-widest uppercase">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>RohingyaConnect Creator Hub</span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight mt-0.5">Creator Dashboard & Analytics</h2>
          <p className="text-[11px] text-slate-400 leading-snug">Track your content reach, audience demographics, and community impact.</p>
        </div>

        {/* Date Filters */}
        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer uppercase ${timeRange === range ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* CORE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Views Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Views</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"><Eye className="w-4 h-4" /></span>
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">{data.views.toLocaleString()}</h4>
          <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1"><TrendingUp className="w-3.5 h-3.5" /> +14.2% vs last week</span>
        </div>

        {/* Engagement Rate Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Engagement Rate</span>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400"><BarChart3 className="w-4 h-4" /></span>
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">{data.engagementRate}%</h4>
          <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1"><TrendingUp className="w-3.5 h-3.5" /> +5.8% vs last week</span>
        </div>

        {/* Audience Insights Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Audience Growth</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"><Users className="w-4 h-4" /></span>
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">88.4%</h4>
          <span className="text-[9px] text-teal-500 font-bold flex items-center gap-0.5 mt-1">High retention rate</span>
        </div>

        {/* Net Followers Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Net Followers</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">+{timeRange === '7d' ? '312' : timeRange === '30d' ? '1,280' : '5,490'}</h4>
          <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1"><TrendingUp className="w-3.5 h-3.5" /> Upward projection</span>
        </div>

      </div>

      {/* VIEWS BREAKDOWN FILTER CONTROLS & CHARTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        
        {/* Breakdown Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-850">
          <div>
            <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4.5 h-4.5 text-emerald-500" /> Filterable Views Breakdown
            </h3>
            <p className="text-[10px] text-slate-400">Toggle filters to filter live stats for views and retention dynamics.</p>
          </div>
        </div>

        {/* Filters Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 py-4">
          
          {/* Views Type filter */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">Views Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-850 rounded-xl p-1">
              {(['all', 'organic', 'shared'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setViewsTypeFilter(f)}
                  className={`flex-1 py-1 text-[9px] font-extrabold rounded-lg transition-all capitalize cursor-pointer ${viewsTypeFilter === f ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Media Type filter */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">Media Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-850 rounded-xl p-1">
              {(['all', 'video', 'image', 'text'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMediaTypeFilter(f)}
                  className={`flex-1 py-1 text-[9px] font-extrabold rounded-lg transition-all capitalize cursor-pointer ${mediaTypeFilter === f ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* View Type Filter (Unique vs Repeat) */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">View Category</label>
            <div className="flex bg-slate-100 dark:bg-slate-850 rounded-xl p-1">
              {(['all', 'unique', 'repeat'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setViewTypeFilter(f)}
                  className={`flex-1 py-1 text-[9px] font-extrabold rounded-lg transition-all capitalize cursor-pointer ${viewTypeFilter === f ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Dynamic Visual Chart (Custom Bar Graph Representation) */}
        <div className="mt-4">
          <div className="h-44 flex items-end gap-3.5 border-b border-l border-slate-150 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl relative">
            
            {/* Grid Lines */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100 dark:border-slate-900 pointer-events-none" />
            <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100 dark:border-slate-900 pointer-events-none" />
            <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100 dark:border-slate-900 pointer-events-none" />

            {/* Individual Bars */}
            {data.viewsTimeline.map((item, idx) => {
              const maxVal = Math.max(...data.viewsTimeline.map(t => t.value)) || 1;
              const heightPercent = `${Math.max((item.value / maxVal) * 100, 10)}%`;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-800 text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none text-white z-10 whitespace-nowrap shadow-md">
                    {item.value.toLocaleString()} views
                  </div>

                  {/* Visual Bar */}
                  <div 
                    style={{ height: heightPercent }}
                    className="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-700 dark:to-teal-500 rounded-t-md hover:from-emerald-500 hover:to-teal-300 transition duration-300 shadow-xs"
                  />
                  
                  <span className="text-[9px] text-slate-400 mt-2 font-semibold">{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <span className="text-[10px] text-slate-400 font-light leading-relaxed">
              Filtered values represents <strong className="text-emerald-500 font-bold">{data.uniqueUsers.toLocaleString()} unique viewers</strong> with a <strong className="text-teal-500 font-bold">{data.repeatRatio}% return visitor engagement</strong> category ratio.
            </span>
          </div>

        </div>

      </div>

      {/* AUDIENCE DEMOGRAPHICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Audience Locations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
            <PieChart className="w-4.5 h-4.5 text-emerald-500" /> Geographic Insights
          </h3>
          <div className="space-y-3">
            {demographics.map((demo) => (
              <div key={demo.region} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{demo.region}</span>
                  <span className="text-slate-400 font-medium">{demo.count} ({demo.percentage}%)</span>
                </div>
                {/* Custom Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                    style={{ width: `${demo.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Recommendations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Calendar className="w-4.5 h-4.5 text-emerald-500" /> Performance Tips
            </h3>
            <div className="space-y-3 text-[11px] text-slate-400 font-light leading-relaxed">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850">
                <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-0.5">🚀 Highlight Video Content</h5>
                <p>Videos receive 2.4x higher engagement rate in the Sittwe region. Share educational topics in Hanifi script.</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850">
                <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-0.5">⏰ Best Posting Time</h5>
                <p>Your followers are most active daily between <strong>6:00 PM and 9:00 PM Cox's Bazar local time</strong>.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 mt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Audit Score</span>
            <span className="text-xs font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/10">Grade A+</span>
          </div>
        </div>

      </div>

    </div>
  );
}
