/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Plus, Image as ImageIcon, Layout, Type, Send, X, Heart, MessageCircle, Share2, MapPin, Calendar, LogIn, LogOut, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { BalancedLayout, HeroLayout, CollageLayout, StoryLayout, SplitLayout } from "./components/Layouts";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc,
  User
} from "./firebase";
import { handleFirestoreError, OperationType } from "./lib/errorHandlers";

interface Post {
  id: string;
  title: string;
  date: string;
  layout: string;
  filter?: string;
  description: string;
  images: string[];
  tags: string[];
  location?: string;
  authorId?: string;
  authorName?: string;
}

const TEMPLATES = [
  { name: "1:1 균형형", desc: "정갈한 기본 갤러리", icon: <Layout className="w-4 h-4" /> },
  { name: "메인 강조형", desc: "대표 사진 중심", icon: <ImageIcon className="w-4 h-4" /> },
  { name: "자유형", desc: "감성 콜라주", icon: <Plus className="w-4 h-4" /> },
  { name: "스토리형", desc: "세로 흐름형", icon: <Type className="w-4 h-4" /> },
  { name: "분할형", desc: "에디토리얼 무드", icon: <Layout className="w-4 h-4" /> },
];

const FILTERS = [
  { name: "none", label: "원본" },
  { name: "Vintage", label: "빈티지" },
  { name: "Black and White", label: "흑백" },
  { name: "Sepia", label: "세피아" },
];

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [popupImages, setPopupImages] = useState<string[]>([]);
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [newPost, setNewPost] = useState<Partial<Post>>({
    title: "",
    description: "",
    layout: "1:1 균형형",
    filter: "none",
    images: [],
    tags: [],
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.6 quality for better size management
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore posts listener
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleDateString('ko-KR').replace(/\s/g, '').slice(0, -1) || "방금 전"
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "posts");
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("정말로 이 기록을 삭제하시겠습니까?")) return;
    
    try {
      await deleteDoc(doc(db, "posts", postId));
      alert("기록이 삭제되었습니다.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "posts");
    }
  };

  const handleUpload = async () => {
    if (!user || !newPost.title || (newPost.images?.length || 0) === 0) {
      alert("제목과 사진을 모두 입력해주세요.");
      return;
    }
    
    setIsUploading(true);
    try {
      // Check total size of images (approximate)
      const totalSize = (newPost.images || []).reduce((acc, img) => acc + img.length, 0);
      if (totalSize > 850000) { // Leave some room for other fields (Firestore limit is 1MB)
        alert("사진 전체 용량이 너무 큽니다. 사진 수를 줄이거나 다른 사진을 선택해주세요.");
        setIsUploading(false);
        return;
      }

      await addDoc(collection(db, "posts"), {
        title: newPost.title,
        layout: newPost.layout,
        filter: newPost.filter,
        description: newPost.description || "",
        images: newPost.images,
        tags: newPost.tags || [],
        location: "기록된 장소",
        authorId: user.uid,
        authorName: user.displayName || "익명",
        createdAt: serverTimestamp()
      });

      setIsUploadOpen(false);
      setNewPost({ title: "", description: "", layout: "1:1 균형형", filter: "none", images: [], tags: [] });
      alert("기록이 성공적으로 발행되었습니다.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "posts");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = [...(newPost.images || [])];
    
    for (const file of Array.from(files)) {
      if (newImages.length >= 20) {
        alert("최대 20장까지만 업로드 가능합니다.");
        break;
      }

      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (error) {
        console.error("Image compression error:", error);
      }
    }
    
    setNewPost(prev => ({ ...prev, images: newImages }));
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      const newImages = [...(newPost.images || [])];
      for (const file of Array.from(files)) {
        if (newImages.length >= 20) break;
        if (file.type.startsWith("image/")) {
          try {
            const compressed = await compressImage(file);
            newImages.push(compressed);
          } catch (error) {
            console.error(error);
          }
        }
      }
      setNewPost(prev => ({ ...prev, images: newImages }));
    }
  };

  const renderLayout = (layout: string, images: string[], filter?: string, onImageClick?: (index: number, images: string[]) => void) => {
    switch (layout) {
      case "1:1 균형형": return <BalancedLayout images={images} filter={filter} onImageClick={onImageClick} />;
      case "메인 강조형": return <HeroLayout images={images} filter={filter} onImageClick={onImageClick} />;
      case "자유형": return <CollageLayout images={images} filter={filter} onImageClick={onImageClick} />;
      case "스토리형": return <StoryLayout images={images} filter={filter} onImageClick={onImageClick} />;
      case "분할형": return <SplitLayout images={images} filter={filter} onImageClick={onImageClick} />;
      default: return <BalancedLayout images={images} filter={filter} onImageClick={onImageClick} />;
    }
  };

  const handleImageClick = (index: number, images: string[]) => {
    setPopupImages(images);
    setPopupIndex(index);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (popupIndex !== null && popupImages.length > 0) {
      setPopupIndex((prev) => (prev! + 1) % popupImages.length);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (popupIndex !== null && popupImages.length > 0) {
      setPopupIndex((prev) => (prev! - 1 + popupImages.length) % popupImages.length);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (popupIndex === null) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") setPopupIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popupIndex, popupImages]);

  const isAdmin = (user: User | null) => {
    return user?.email === "ghkdeld1211@gmail.com";
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f2eb]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-[#2d2a26] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f6f2eb]/80 backdrop-blur-md border-b border-[#ded6ca]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2d2a26] text-white shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-serif">프레임일기</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7b7268] font-medium">Frame Diary</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#ded6ca]">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <UserIcon className="w-3 h-3 text-[#7b7268]" />
                  )}
                  <span className="text-xs font-medium text-[#2d2a26]">{user.displayName}</span>
                </div>
                <button 
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-[#2d2a26] px-5 py-2 text-sm font-medium text-white shadow-md transition hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">새 기록</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-[#7b7268] hover:bg-[#eee6db] transition"
                  title="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 rounded-full bg-white border border-[#2d2a26] px-5 py-2 text-sm font-medium text-[#2d2a26] shadow-sm transition hover:bg-[#2d2a26] hover:text-white"
              >
                <LogIn className="w-4 h-4" />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-16">
        {/* Hero Section */}
        <section className="relative h-[400px] w-full overflow-hidden rounded-[40px] shadow-2xl group">
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" 
            alt="Hero" 
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-10 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] uppercase tracking-widest mb-4">Featured Story</span>
              <h2 className="text-4xl font-bold mb-2 font-serif">계절이 머무는 자리</h2>
              <p className="text-white/80 max-w-md text-sm leading-relaxed">우리가 지나온 시간들이 사진 속에 머물러 있습니다. 당신의 오늘을 아름다운 프레임에 담아보세요.</p>
            </motion.div>
          </div>
        </section>

        {/* Posts List */}
        <div className="space-y-24">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="group"
              >
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[#8a8178] text-xs font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                      <span className="w-1 h-1 rounded-full bg-[#d8cfc2]" />
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {post.location}</span>
                      {post.authorName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#d8cfc2]" />
                          <span className="flex items-center gap-1">by {post.authorName}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight font-serif group-hover:text-[#5a5a40] transition-colors">{post.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white border border-[#ded6ca] text-[10px] text-[#7b7268] font-medium">#{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  {renderLayout(post.layout, post.images, post.filter, handleImageClick)}
                </div>

                <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
                  <p className="text-[#6d655d] leading-relaxed text-lg font-light italic">
                    "{post.description}"
                  </p>
                  <div className="flex items-center gap-6 text-[#8a8178]">
                    <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="text-xs font-medium">24</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-xs font-medium">8</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-black transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    {(user?.uid === post.authorId || isAdmin(user)) && (
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="flex items-center gap-2 hover:text-red-600 transition-colors"
                        title="삭제하기"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-12 h-px bg-gradient-to-r from-transparent via-[#ded6ca] to-transparent" />
              </motion.article>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white border border-[#ded6ca] text-[#8a8178]">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-[#8a8178] font-medium">아직 등록된 기록이 없습니다.</p>
              {!user && (
                <button onClick={handleLogin} className="text-sm font-bold text-[#2d2a26] underline underline-offset-4">로그인하고 첫 기록을 남겨보세요</button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-[32px] bg-[#fbf8f3] shadow-2xl border border-[#ded6ca]"
            >
              <div 
                className={`max-h-[90vh] overflow-y-auto p-8 custom-scrollbar transition-colors ${isDragging ? "bg-[#eee6db]" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDragging && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-[#2d2a26] text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
                      <Plus className="w-6 h-6" />
                      <span className="font-bold">사진을 여기에 놓으세요</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-inherit z-20 py-2 -mt-2">
                  <h2 className="text-2xl font-bold font-serif">새로운 기록 남기기</h2>
                  <button onClick={() => setIsUploadOpen(false)} className="p-2 rounded-full hover:bg-[#eee6db] transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 pb-24 lg:pb-0">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8178]">사진 관리 ({newPost.images?.length || 0}/20)</label>
                        {(newPost.images?.length || 0) > 0 && (
                          <button 
                            onClick={() => {
                              setNewPost(prev => ({ ...prev, images: [] }));
                              setSelectedImageIndex(0);
                            }}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            모두 삭제
                          </button>
                        )}
                      </div>

                      {/* Main Preview Area */}
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[#eee6db] border border-[#ded6ca] shadow-inner group">
                        {newPost.images && newPost.images.length > 0 ? (
                          <>
                            <AnimatePresence mode="wait">
                              <motion.img 
                                key={selectedImageIndex}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                src={newPost.images[selectedImageIndex]} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            </AnimatePresence>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button 
                              onClick={() => {
                                const newImages = newPost.images?.filter((_, idx) => idx !== selectedImageIndex) || [];
                                setNewPost(prev => ({ ...prev, images: newImages }));
                                if (selectedImageIndex >= newImages.length && newImages.length > 0) {
                                  setSelectedImageIndex(newImages.length - 1);
                                } else if (newImages.length === 0) {
                                  setSelectedImageIndex(0);
                                }
                              }}
                              className="absolute top-4 right-4 p-3 bg-white/90 text-red-500 rounded-full shadow-xl hover:scale-110 active:scale-95 transition opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-[10px] font-bold rounded-full backdrop-blur-md">
                              {selectedImageIndex + 1} / {newPost.images.length}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-[#8a8178]">
                            <div className="p-6 rounded-full bg-[#fbf8f3] border-2 border-dashed border-[#d8cfc2]">
                              <ImageIcon className="w-10 h-10 opacity-40" />
                            </div>
                            <p className="text-xs font-medium">아직 선택된 사진이 없습니다.</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Horizontal Carousel of Thumbnails */}
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-2 custom-scrollbar snap-x">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept="image/*"
                          multiple
                        />
                        {(newPost.images?.length || 0) < 20 && (
                          <button 
                            onClick={triggerFileInput}
                            className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-[#d8cfc2] flex flex-col items-center justify-center gap-1 text-[#8a8178] hover:bg-white hover:border-[#2d2a26] hover:text-[#2d2a26] transition-all group snap-start"
                          >
                            <Plus className="w-5 h-5" />
                            <span className="text-[8px] font-bold">추가</span>
                          </button>
                        )}

                        <AnimatePresence mode="popLayout">
                          {newPost.images?.map((img, i) => (
                            <motion.button 
                              key={i}
                              layout
                              initial={{ opacity: 0, scale: 0.8, x: 20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: -20 }}
                              onClick={() => setSelectedImageIndex(i)}
                              className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden relative border-2 transition-all snap-start ${
                                selectedImageIndex === i ? "border-[#2d2a26] scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              {selectedImageIndex === i && (
                                <div className="absolute inset-0 bg-[#2d2a26]/10" />
                              )}
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8178] mb-3">감성 필터</label>
                      <div className="grid grid-cols-2 gap-2">
                        {FILTERS.map((f) => (
                          <button
                            key={f.name}
                            onClick={() => setNewPost(prev => ({ ...prev, filter: f.name }))}
                            className={`px-4 py-2 rounded-xl border text-xs font-medium transition ${
                              newPost.filter === f.name
                                ? "bg-[#2d2a26] text-white border-[#2d2a26]"
                                : "bg-white border-[#e3dbd0] hover:border-[#2d2a26]"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 lg:sticky lg:top-20 h-fit">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8178] mb-3">레이아웃 스타일</label>
                      <div className="grid grid-cols-1 gap-2">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.name}
                            onClick={() => setNewPost(prev => ({ ...prev, layout: t.name }))}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                              newPost.layout === t.name 
                                ? "bg-[#2d2a26] text-white border-[#2d2a26]" 
                                : "bg-white border-[#e3dbd0] hover:border-[#2d2a26]"
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${newPost.layout === t.name ? "bg-white/20" : "bg-[#f6f2eb]"}`}>
                              {t.icon}
                            </div>
                            <div>
                              <div className="text-xs font-bold">{t.name}</div>
                              <div className={`text-[10px] ${newPost.layout === t.name ? "text-white/60" : "text-[#8a8178]"}`}>{t.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 lg:sticky lg:top-20 h-fit">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8178] mb-3">이야기 제목</label>
                      <input 
                        type="text" 
                        placeholder="오늘의 제목을 적어주세요"
                        value={newPost.title}
                        onChange={e => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-white border border-[#e3dbd0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d2a26]/10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8178] mb-3">짧은 생각</label>
                      <textarea 
                        rows={4}
                        placeholder="이 순간의 감정을 기록해보세요"
                        value={newPost.description}
                        onChange={e => setNewPost(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-white border border-[#e3dbd0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d2a26]/10 resize-none"
                      />
                    </div>

                    <div className="hidden lg:block pt-4">
                      <button 
                        onClick={handleUpload}
                        disabled={isUploading || !newPost.title || (newPost.images?.length || 0) === 0}
                        className="w-full flex items-center justify-center gap-2 bg-[#2d2a26] text-white py-4 rounded-2xl font-bold shadow-lg transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isUploading ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{isUploading ? "발행 중..." : "기록 발행하기"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sticky Mobile Footer */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-[#fbf8f3]/80 backdrop-blur-md border-t border-[#ded6ca] z-30">
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading || !newPost.title || (newPost.images?.length || 0) === 0}
                    className="w-full flex items-center justify-center gap-2 bg-[#2d2a26] text-white py-4 rounded-2xl font-bold shadow-lg transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {isUploading ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isUploading ? "발행 중..." : "기록 발행하기"}</span>
                  </button>
                </div>

                {/* Live Preview Section */}
                {(newPost.images?.length || 0) > 0 && (
                  <div className="mt-16 pt-16 border-t border-[#ded6ca]">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 rounded-lg bg-[#2d2a26] text-white">
                        <Layout className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold font-serif">미리보기</h3>
                      <span className="text-[10px] text-[#8a8178] font-bold uppercase tracking-widest">Live Preview</span>
                    </div>
                    
                    <div className="bg-white rounded-[40px] p-10 shadow-sm border border-[#ded6ca]">
                      <div className="mb-8 space-y-2">
                        <div className="flex items-center gap-3 text-[#8a8178] text-[10px] font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date().toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-[#d8cfc2]" />
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> 기록될 장소</span>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight font-serif">{newPost.title || "제목을 입력해주세요"}</h3>
                      </div>
                      
                      <div className="mb-8">
                        {renderLayout(newPost.layout || "1:1 균형형", newPost.images || [], newPost.filter, handleImageClick)}
                      </div>
                      
                      <p className="text-[#6d655d] leading-relaxed text-lg font-light italic">
                        "{newPost.description || "당신의 생각을 적어주세요..."}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Popup Modal */}
      <AnimatePresence>
        {popupIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPopupIndex(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-10 cursor-zoom-out"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                setPopupIndex(null);
              }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {popupImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 sm:left-10 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[110]"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 sm:right-10 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[110]"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 text-white text-sm font-medium backdrop-blur-md z-[110]">
                  {popupIndex + 1} / {popupImages.length}
                </div>
              </>
            )}
            
            <motion.div
              key={popupIndex}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={popupImages[popupIndex]}
                alt="Enlarged view"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#2d2a26] text-white py-20">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-serif">프레임일기</h2>
            <p className="text-white/60 text-sm max-w-xs">당신의 소중한 순간들이 잊혀지지 않도록, 아름다운 프레임에 담아 기록합니다.</p>
          </div>
          <div className="flex items-center justify-center gap-8 text-white/40 text-xs font-medium uppercase tracking-widest">
            <a href="#" className="hover:text-white transition">About</a>
            <a href="#" className="hover:text-white transition">Archive</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
          <p className="text-white/20 text-[10px]">&copy; 2026 Frame Diary. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
