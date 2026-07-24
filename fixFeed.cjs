const fs = require('fs');
let code = fs.readFileSync('./src/components/Feed.tsx', 'utf8');

const targetToRemove = `        {/* Post Options Menu / Bottom Sheet */}
        <AnimatePresence>
          {isPostMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPostMenuOpen(false)}
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
              />
              
              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
              >
                <div className="p-4">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                  
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        if (confirm('Most of your post will be like this')) {
                          setIsInterested(true);
                          setIsPostMenuOpen(false);
                          toast('Marked as interested');
                        }
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <ThumbsUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Interested</span>
                        <span className="text-[11px] text-slate-500">Show more posts like this</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsPostMenuOpen(false);
                        setHidePostState(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Not interested</span>
                        <span className="text-[11px] text-slate-500">Show fewer posts like this</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsPostMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('open-report-post', { detail: { postId: data.id } }));
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Flag className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Report post</span>
                        <span className="text-[11px] text-slate-500">I'm concerned about this post</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setNotificationsOn(!notificationsOn);
                        setIsPostMenuOpen(false);
                        toast(notificationsOn ? 'Notifications turned off' : 'Notifications turned on');
                      }}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {notificationsOn ? (
                            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          ) : (
                            <BellOff className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Turn {notificationsOn ? 'off' : 'on'} notifications</span>
                          <span className="text-[11px] text-slate-500">For this post</span>
                        </div>
                      </div>
                      <div className={\`w-12 h-6 rounded-full transition-colors relative \${notificationsOn ? 'bg-[#1877F2]' : 'bg-slate-300 dark:bg-slate-600'}\`}>
                        <div className={\`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform \${notificationsOn ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}\`} />
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsPostMenuOpen(false);
                        toast('You have copied this post link');
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Link2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Copy link</span>
                        <span className="text-[11px] text-slate-500">Copy link to clipboard</span>
                      </div>
                    </button>
                  </div>
                  
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3">
                    <button
                      onClick={() => setIsPostMenuOpen(false)}
                      className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-sm font-extrabold transition text-slate-700 dark:text-slate-300 text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
      )}
    </div>
  );
}`;
code = code.replace(targetToRemove, `    </div>
  );
}`);

const targetInsert = `                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}`;
const replacementInsert = `                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
${targetToRemove.replace('    </div>\n  );\n}', `    </div>
  );
}`)}`

code = code.replace(targetInsert, replacementInsert);
fs.writeFileSync('./src/components/Feed.tsx', code);
