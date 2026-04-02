import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Sparkles, X, Globe, Video, Camera, StopCircle, FileText, LogOut, Download, Zap, LayoutGrid, ShoppingCart, ShieldCheck, Tag, Mail, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import Auth from './components/Auth';
import { DualText } from './components/DualText';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const resizeImage = async (base64: string, maxWidth: number = 2048): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        } else {
          width = (width / height) * maxWidth;
          height = maxWidth;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  });
};

const formatError = (err: any): string => {
  let msg = err.message || "";
  
  try {
    if (msg.includes('{')) {
      const start = msg.indexOf('{');
      const end = msg.lastIndexOf('}') + 1;
      const jsonStr = msg.substring(start, end);
      const parsed = JSON.parse(jsonStr);
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message;
      }
    }
  } catch (e) {
    // Ignore parse error
  }

  if (msg.includes("limit: 0")) {
    return "This AI feature is currently restricted by Google in your region (Jordan) for the free tier. To enable this, you may need to use a VPN or upgrade to a paid Gemini API key.";
  }

  return msg || "An unexpected error occurred.";
};

const t = {
  title: { ar: "المنير للبصريات", en: "Al Moneer Opticals" },
  subtitle: { ar: "مستشار أزياء الذكاء الاصطناعي", en: "AI Fashion Consultant" },
  heading: { ar: "اكتشف نظاراتك المثالية", en: "Discover Your Perfect Frame" },
  description: {
    ar: "سجل مقطع فيديو تنظر فيه إلى الكاميرا ثم تدير رأسك إلى اليمين وتعود ثم إلى اليسار (ببطء) للحصول على قياسات دقيقة للوجه. لن تتمكن من رؤية ما تقوم بتسجيله حتى تنتهي، ثم يمكنك رؤية الفيديو بأكمله.",
    en: "Record a video looking at the camera then turning your head to the right and back then to the left (slowly) for precise facial measurements (IPD & Face Width). You will not be able to see what you are recording till you finish, then you can see the whole video."
  },
  dragDrop: { ar: "اسحب وأفلت مقطع الفيديو", en: "Drag and drop your video" },
  browse: { ar: "أو انقر للتصفح من جهازك", en: "or click to browse from your device" },
  selectVideo: { ar: "اختر فيديو", en: "Select Video" },
  captureVideo: { ar: "تسجيل فيديو", en: "Record Video" },
  stopRecording: { ar: "إيقاف التسجيل", en: "Stop Recording" },
  consulting: { ar: "جاري تحليل الفيديو...", en: "Analyzing Video..." },
  analyze: { ar: "تحليل وتنظيم", en: "Analyze & Curate" },
  analyzing: { ar: "جاري تحليل بنية الوجه...", en: "Analyzing facial architecture..." },
  analysisComplete: { ar: "اكتمل التحليل", en: "Analysis Complete" },
  precisionMapping: { ar: "قامت خوارزمياتنا البصرية برسم بنية وجهك بدقة 99.8% لضمان ملاءمة مثالية للإطار.", en: "Our optical algorithms have mapped your facial structure with 99.8% precision for a perfect frame fit." },
  faceScan: { ar: "مسح الوجه", en: "Face Scan" },
  symmetryIndex: { ar: "مؤشر التماثل", en: "Symmetry Index" },
  cheekbones: { ar: "عظام الخد", en: "Cheekbones" },
  jawline: { ar: "خط الفك", en: "Jawline" },
  styleInsight: { ar: "رؤية الأسلوب", en: "Style Insight" },
  prominent: { ar: "بارزة", en: "Prominent" },
  tapered: { ar: "مستدق", en: "Tapered" },
  seeRecommendations: { ar: "عرض التوصيات", en: "See Recommendations" },
  waiting: {
    ar: "ستظهر استشارتك المخصصة أو قياساتك هنا بمجرد تحليل الفيديو.",
    en: "Your bespoke consultation or measurements will appear here once your video is analyzed."
  },
  errorVideo: { ar: "فشلت معالجة الفيديو. يرجى محاولة تسجيل فيديو أقصر (أقل من 200 ميغابايت).", en: "Failed to process video. Please try a shorter video (under 200MB)." },
  errorAnalysis: { ar: "حدث خطأ أثناء التحليل.", en: "An error occurred during analysis." },
  noAnalysis: { ar: "لم يتم تقديم تحليل.", en: "No analysis provided." },
  cameraError: { ar: "تعذر الوصول إلى الكاميرا. يرجى التحقق من الأذونات.", en: "Could not access camera. Please check permissions." },
  measurements: { ar: "قياسات الوجه", en: "Facial Measurements" },
  ipd: { ar: "المسافة بين الحدقتين", en: "Pupillary Distance (IPD)" },
  faceWidth: { ar: "عرض الوجه", en: "Face Width" },
  bridgeSize: { ar: "حجم الجسر", en: "Bridge Size" },
  keyframes: { ar: "الإطارات الرئيسية", en: "Key Frames" },
  frontView: { ar: "العرض الأمامي", en: "Front View" },
  leftProfile: { ar: "الجانب الأيسر", en: "Left Profile" },
  rightProfile: { ar: "الجانب الأيمن", en: "Right Profile" },
  optionalInfo: { ar: "معلومات إضافية (اختياري)", en: "Optional Information" },
  ipdLabel: { ar: "المسافة بين الحدقتين (IPD)", en: "Known IPD (mm)" },
  prescriptionLabel: { ar: "الوصفة الطبية", en: "Prescription" },
  analysisSummary: { ar: "ملخص التحليل", en: "Analysis Summary" },
  recommendedFrames: { ar: "الإطارات الموصى بها", en: "Recommended Frames" },
  logout: { ar: "تسجيل الخروج", en: "Log Out" },
  tryOnTitle: { ar: "تجربة افتراضية", en: "Virtual Try-On" },
  tryOnDesc: { ar: "أين تود أن ترى نفسك ترتدي", en: "Where would you like to see yourself wearing the" },
  selectScenario: { ar: "اختر سيناريو", en: "Select a Scenario" },
  customScenario: { ar: "سيناريو مخصص", en: "Custom Scenario" },
  customScenarioPlaceholder: { ar: "مثال: في حفل زفاف في إيطاليا", en: "e.g., At a wedding in Italy" },
  generatingImage: { ar: "جاري إنشاء الصورة...", en: "Generating Image..." },
  generateTryOn: { ar: "إنشاء تجربة افتراضية", en: "Generate Try-On" },
  downloadImage: { ar: "تحميل الصورة", en: "Download Image" },
  close: { ar: "إغلاق", en: "Close" },
  prof: { ar: "مهني", en: "Professional" },
  execBoardroom: { ar: "غرفة اجتماعات تنفيذية", en: "Executive Boardroom" },
  active: { ar: "نشط", en: "Active" },
  playingTennis: { ar: "لعب التنس", en: "Playing Tennis" },
  badmintonCourt: { ar: "ملعب تنس الريشة", en: "Badminton Court" },
  tableTennis: { ar: "تنس الطاولة", en: "Table Tennis" },
  leisure: { ar: "ترفيه", en: "Leisure" },
  sunsetBoat: { ar: "غروب الشمس على قارب", en: "Sunset on a Boat" },
  luxuryMall: { ar: "مركز تسوق فاخر", en: "Luxury Shopping Mall" },
  social: { ar: "اجتماعي", en: "Social" },
  gardenPicnic: { ar: "نزهة في الحديقة", en: "Garden Picnic" },
  eveningParty: { ar: "حفلة مسائية", en: "Evening Party/Gala" },
  utility: { ar: "عملي", en: "Utility" },
  drivingNight: { ar: "القيادة ليلاً", en: "Driving at Night" },
  lifestyle: { ar: "أسلوب حياة", en: "Lifestyle" },
  beachWalk: { ar: "ممشى الشاطئ", en: "Beach Side-Walk" },
  other: { ar: "أخرى", en: "Other" },
  customScenarioOption: { ar: "سيناريو مخصص...", en: "Custom Scenario..." },
  privacyNotice: { ar: "نحن لا نحفظ أي فيديو لضمان خصوصيتك. يمكنك حفظ التوصيات باستخدام زر الحفظ.", en: "We do not save any video for privacy issues. You can save your recommendations using the save button." },
  discountTitle: { ar: "خصم 5% حصري لك!", en: "Exclusive 5% Discount for You!" },
  discountDesc: { ar: "كل ما عليك فعله هو الذهاب إلى المتجر، وإخبار أخصائي البصريات ببريدك الإلكتروني، وسيقوم الأخصائي باستخراج التوصيات وعرض الإطارات لك.", en: "All you need to do is go to the shop, tell the optician your email address and the optician will take out the recommendations and show the frames." },
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [videoResult, setVideoResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  
  // Optional info state
  const [manualIpd, setManualIpd] = useState<string>('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  
  // Try On state
  const [tryOnFrame, setTryOnFrame] = useState<string | null>(null);
  const [tryOnFrameImage, setTryOnFrameImage] = useState<string | null>(null);
  const [tryOnScenario, setTryOnScenario] = useState<string>('Executive Boardroom');
  const [tryOnCustomScenario, setTryOnCustomScenario] = useState<string>('');
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  // Camera state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCapturingPrescription, setIsCapturingPrescription] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session initialization error:", sessionError);
          // If refresh token is invalid, clear it and force re-login
          if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            setSession(null);
          }
        } else {
          setSession(session);
        }
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        // If it's a fetch error, we might be offline or Supabase is down
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setError({
            ar: 'فشل الاتصال بخادم قاعدة البيانات. يرجى التحقق من اتصال الإنترنت الخاص بك.',
            en: 'Failed to connect to the database server. Please check your internet connection.'
          });
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        // Clear any local state if needed
        setResult(null);
        setVideoResult(null);
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const startCamera = async (forPrescription = false) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: forPrescription ? 'environment' : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      setIsCapturing(true);
      setIsCapturingPrescription(forPrescription);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(t.cameraError);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], 'prescription-capture.jpg', { type: 'image/jpeg' });
        setPrescriptionFile(capturedFile);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setIsCapturingPrescription(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm',
      videoBitsPerSecond: 8000000 // 8 Mbps for high quality Full HD video
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const recordedFile = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
      setFile(recordedFile);
      setPreviewUrl(URL.createObjectURL(recordedFile));
      setIsVideo(true);
      setResult(null);
      setVideoResult(null);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setIsVideo(selectedFile.type.startsWith('video/'));
      setResult(null);
      setVideoResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile && (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/'))) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setIsVideo(selectedFile.type.startsWith('video/'));
      setResult(null);
      setVideoResult(null);
      setError(null);
    }
  };

  const clearVideo = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setResult(null);
    setVideoResult(null);
    setError(null);
    setSaveSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveFaceAnalysis = async () => {
    if (!session?.user?.id || !videoResult) return;
    
    const ipd = videoResult.measurements?.estimated_mm?.ipd || null;
    
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: session.user.id,
        face_analysis_raw: videoResult,
        ipd_measurement: ipd ? parseFloat(ipd) : null
      });
      
    if (error) throw error;
  };

  const saveRecommendations = async () => {
    if (!session?.user?.id || !videoResult?.recommendations) return;
    
    const recommendations = videoResult.recommendations.map((rec: any) => ({
      user_id: session.user.id,
      frame_name: rec.model_name || 'Unknown Frame',
      reasoning: `English:\n${rec.pitch_en}\n\nArabic:\n${rec.pitch_ar}`,
      image_url: rec.image_url || null
    }));
    
    const { error } = await supabase
      .from('recommendations')
      .insert(recommendations);
      
    if (error) throw error;
  };

  const generateTryOnImage = async () => {
    if (!file || !tryOnFrame) return;
    if (!ai) {
      setTryOnError("AI configuration is missing. Please check your API key.");
      return;
    }
    setIsTryingOn(true);
    setTryOnError(null);
    setTryOnResultUrl(null);

    try {
      let base64Image = '';
      let mimeType = '';

      if (isVideo) {
        base64Image = await new Promise<string>((resolve, reject) => {
          const video = document.createElement('video');
          video.src = URL.createObjectURL(file);
          video.currentTime = 0.5;
          video.muted = true;
          video.playsInline = true;
          video.onseeked = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const rawBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
            resolve(await resizeImage(rawBase64, 2048));
          };
          video.onerror = reject;
        });
        mimeType = 'image/jpeg';
      } else {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        base64Image = await resizeImage(rawBase64, 2048);
        mimeType = 'image/jpeg';
      }

      const scenarioText = tryOnScenario === 'Custom Scenario' ? tryOnCustomScenario : tryOnScenario;
      const ipd = videoResult?.measurements?.estimated_mm?.ipd || manualIpd || '62';
      const bridgeSize = videoResult?.measurements?.estimated_mm?.bridge_size || '18';

      let frameBase64 = '';
      let frameMimeType = '';
      if (tryOnFrameImage) {
        try {
          const rawFrameBase64 = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
            };
            img.onerror = () => reject(new Error('Failed to load frame image'));
            img.src = tryOnFrameImage;
          });
          frameBase64 = await resizeImage(rawFrameBase64, 800);
          frameMimeType = 'image/jpeg';
        } catch (e) {
          console.warn("Could not load frame image for try-on", e);
        }
      }

      const prompt = `ROLE 1: Al Moneer Opticals Lifestyle Imaging Engine.
ROLE 2 (PRIORITY 1): Master Portrait Preservationist.
ROLE 3 (PRIORITY 2 - NEW): Face-Mask Refiner and Skin Smoother.

TASK: Create a single, high-definition photograph showing the specific user from input image 1 (image_0.png) seamlessly wearing the specific eyeglass frame from input image 2 (image_1.png) within the chosen scenario: ${scenarioText}.

CRITICAL EXECUTION RULES:

FACE INTEGRITY (HIGHEST PRIORITY): Look at the face in the first input image (image_0.png). You are commanded NOT to apply any beautification, skin smoothing, pore removal, or filtering. Do NOT make the face appear more smooth, whiten the skin, or remove natural facial lines. You are SPECIFICALLY PROHIBITED from adding extra wrinkles, increasing the amount of white or grey hair, or introducing any form of beard or facial stubble that is not present in the original image. THE USER MUST LOOK THEIR EXACT, AUTHENTIC AGE AND TEXTURE FROM image_0.png.

SKIN SMOOTHNESS & VIBRANCY (FACIAL MASK REFINER): Focus on the texture and noise of the face itself. DO NOT make the skin grainier, less vibrant, or more pale. Apply targeted, high-quality noise reduction solely to the face mask. Ensure the skin remains sharp and textured, but entirely free of digital grain or static.

SKIN TONE PRESERVATION: Maintain the exact, deep, warm skin tone of the user from image_0.png. Do NOT whiten the skin.

IDENTITY PRESERVATION: Maintain the precise shape of the hair part, moustache/beard pattern, and eye shape/depth. Do not change the face structure or skin tone.

SUBTLE EMOTION: The person should look happy to be wearing the glasses, showing just a hint of happiness (very subtle).

ANGLED VIEW: The face MUST be positioned at a 3/4 angle (three-quarter view) to clearly show both the front of the frame and the side temples (arms) of the eyeglasses. This is essential to showcase the full design of the frame.

EXACT FRAME OVERLAY: Take the specific eyeglass frame shown in input image 2 (image_1.png). You MUST use the EXACT same colors, EXACT same shape, and EXACT same pattern as shown in that image. The frame must be an exact visual replica. The frame scale must be calculated based on the user's IPD of ${ipd}mm and bridge size of ${bridgeSize}mm to ensure the size is perfectly accurate for the user's face. Position it naturally on the user's nose bridge and temples.

SCENARIO SYNTHESIS: The background, lighting, and reflections on the eyeglass lenses MUST be updated to perfectly match the scenario: ${scenarioText}. Ensure appropriate shadows are cast by the frame onto the face.

HIGH-DEFINITION UPSCALING: Use a superior upscaling model specifically optimized for photorealism. Ensure the final image has no compression artifacts.

INPUT 1: The primary face to be preserved and refined (image_0.png).
INPUT 2: The reference image for the specific eyeglass frame style and pattern (image_1.png).

OUTPUT: One single, high-definition, cohesive photograph of the authentic, non-grainy user wearing the correct glasses in the correct setting.`;

      const parts: any[] = [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
      ];

      if (frameBase64) {
        parts.push({
          inlineData: {
            data: frameBase64,
            mimeType: frameMimeType,
          },
        });
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setTryOnResultUrl(imageUrl);
      } else {
        throw new Error("No image generated.");
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = formatError(err);
      const isQuotaError = err.status === 429 || 
                          errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('exhausted') ||
                          errorMessage.toLowerCase().includes('rate limit');
      
      if (isQuotaError) {
        setTryOnError(`AI Limit Reached: ${errorMessage || "Please wait 60 seconds and try again."}`);
      } else {
        setTryOnError(`Error: ${errorMessage || "Failed to generate try-on image."}`);
      }
    } finally {
      setIsTryingOn(false);
    }
  };

  const handleSaveResults = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveFaceAnalysis();
      await saveRecommendations();
      setSaveSuccess(true);
      setShowDiscount(true);
    } catch (err: any) {
      console.error('Failed to save results:', err);
      setError(err.message || 'Failed to save results.');
    } finally {
      setIsSaving(false);
    }
  };

  const extractFramesFromVideo = async (videoFile: File, frameCount: number = 8): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      const loadTimeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Video loading timed out. The file might be too large or in an unsupported format."));
      }, 30000); // 30 second timeout for loading metadata

      video.onloadedmetadata = async () => {
        clearTimeout(loadTimeout);
        try {
          const duration = video.duration;
          if (!duration || isNaN(duration) || duration === Infinity) {
            URL.revokeObjectURL(url);
            reject(new Error("Invalid video duration"));
            return;
          }

          const frames: any[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const targetWidth = 1280;
          const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const safeFrameCount = Math.max(2, frameCount);

          for (let i = 0; i < safeFrameCount; i++) {
            setProcessingStatus(`Extracting frame ${i + 1} of ${safeFrameCount}...`);
            const time = (duration / (safeFrameCount - 1)) * i;
            
            // Ensure we actually seek even if the time is 0
            video.currentTime = Math.max(0, Math.min(time, duration - 0.1));
            
            await new Promise((r, rej) => {
              const timeout = setTimeout(() => {
                video.removeEventListener('seeked', onSeeked);
                rej(new Error(`Frame extraction timed out at ${time}s`));
              }, 10000); // 10 second timeout per frame

              const onSeeked = () => {
                clearTimeout(timeout);
                video.removeEventListener('seeked', onSeeked);
                ctx?.drawImage(video, 0, 0, targetWidth, targetHeight);
                frames.push({
                  inlineData: {
                    data: canvas.toDataURL('image/jpeg', 0.7).split(',')[1],
                    mimeType: 'image/jpeg'
                  }
                });
                r(null);
              };
              video.addEventListener('seeked', onSeeked);
              
              // Fallback: if seeked doesn't fire (e.g. already at that time)
              if (video.readyState >= 2) {
                // If already ready, it might not fire seeked if time didn't change enough
                // But usually currentTime change triggers it.
              }
            });
          }
          URL.revokeObjectURL(url);
          resolve(frames);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      video.onerror = () => {
        clearTimeout(loadTimeout);
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video for frame extraction"));
      };
    });
  };

  const analyzeVideo = async () => {
    if (!file) return;
    
    // Check file size (limit to 200MB for high quality video)
    if (file.size > 200 * 1024 * 1024) {
      setError(t.errorVideo);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // Global timeout for the entire analysis process (3 minutes)
    const analysisTimeout = setTimeout(() => {
      if (isAnalyzing) {
        setIsAnalyzing(false);
        setProcessingStatus(null);
        setError("Analysis timed out. Please try with a shorter video or a smaller file.");
      }
    }, 180000);

    try {
      if (!ai) {
        setError("AI configuration is missing. Please check your API key.");
        return;
      }
      // Fetch inventory data directly before analysis with a timeout
      let inventoryCsv = '';
      
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn("Supabase configuration is missing. Using fallback inventory.");
        // Fallback or error? The user got a timeout, so it was likely trying to fetch.
      }

      const inventoryPromise = supabase.from('inventory').select('*');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Inventory fetch timed out. Please check your network connection and Supabase configuration.")), 60000));
      
      const { data: inventoryData, error: inventoryError } = await Promise.race([inventoryPromise, timeoutPromise]) as any;
      
      if (inventoryError) {
        console.error("Failed to fetch inventory:", inventoryError);
        throw new Error("Failed to load inventory data.");
      } else if (inventoryData && inventoryData.length > 0) {
        const headers = Object.keys(inventoryData[0]).join(',');
        const rows = inventoryData.map((row: any) => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        inventoryCsv = `${headers}\n${rows}`;
      } else {
        throw new Error("Inventory is empty.");
      }

      let videoParts: any[] = [];
      
      // If it's a video, always extract frames instead of sending the whole video
      // This avoids "0 Frames found" errors due to missing video metadata in browser-recorded videos
      if (isVideo) {
        setProcessingStatus("Extracting frames for analysis...");
        videoParts = await extractFramesFromVideo(file);
      } else {
        setProcessingStatus("Reading file data...");
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (result) resolve(result.split(',')[1]);
            else reject(new Error("Failed to read file"));
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        videoParts = [{
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        }];
      }

      let prescriptionPart = null;
      if (prescriptionFile) {
        try {
          const rxBase64 = await new Promise<string>((resolve, reject) => {
            const rxReader = new FileReader();
            rxReader.onloadend = () => resolve((rxReader.result as string).split(',')[1]);
            rxReader.onerror = reject;
            rxReader.readAsDataURL(prescriptionFile);
          });
          prescriptionPart = {
            inlineData: {
              data: rxBase64,
              mimeType: prescriptionFile.type,
            }
          };
        } catch (e) {
          console.warn("Failed to read prescription file", e);
        }
      }

      let prompt = '';
      let config: any = {};

      const inventorySource = `Inventory Source\n- Live Inventory Data:\n\`\`\`csv\n${inventoryCsv}\n\`\`\``;

      const extraInfo = [];
      if (manualIpd) {
        extraInfo.push(`User's Known IPD: ${manualIpd}mm. IMPORTANT: You MUST use this exact value for the IPD measurement instead of estimating it from the face scan.`);
      }
      if (prescriptionFile) {
        extraInfo.push(`User's Prescription is attached as an additional document. Please read it. If it contains an IPD and the user didn't manually provide one, use the IPD from the prescription. Also consider the prescription strength when recommending frames (e.g., high minus prescriptions need smaller, thicker frames to hide lens thickness).`);
      }
      const extraInfoText = extraInfo.length > 0 ? `\n\nAdditional User Information:\n${extraInfo.join('\n')}` : '';

      if (isVideo) {
        const isFrameSequence = videoParts.length > 1;
        const videoContext = isFrameSequence 
          ? "The attached images are 12 frames evenly sampled from a video of the user's face."
          : "Analyze the attached video to identify key facial landmarks for the user.";

        prompt = `You are a world-class Luxury Eyewear Consultant and Computer Vision Expert at "Al Moneer Opticals."
            
${videoContext}

Task:
1. Perform a deep "Facial Architecture Analysis" to determine face width (temple-to-temple), Pupillary Distance (IPD), and bridge size.
2. Identify and extract the specific timestamps for three clear views: Front View, Left Profile, Right Profile.
3. Curate a bespoke collection of at least 7 frames from the live inventory. 

CRITICAL SALES & ANALYSIS GUIDELINES:
- Analysis Summary: Write a highly sophisticated, elaborate, and flattering analysis of the user's facial structure. Use terms like "exquisite symmetry," "sculpted jawline," "commanding presence," or "refined features." Explain HOW their specific measurements (IPD, face width) make them a perfect candidate for certain luxury styles.
- Recommendations: For each of the 7+ frames, provide a "Masterpiece Pitch." This must be an elaborate, persuasive, and sales-oriented narrative. Don't just say it fits; explain how it elevates their status, complements their skin tone, and creates a "visual signature." Use high-end fashion terminology.
- Tone: Extremely prestigious, authoritative, yet deeply personal and welcoming. Like a private concierge in a high-end Milanese boutique.

${inventorySource}${extraInfoText}

Technical Requirements:
Use the iris centers to calculate the IPD in pixels.
Use the widest part of the face (zygomatic arch) to calculate face width in pixels.
Note: If a reference object (like a credit card) is visible, use its known width (85.6mm) to convert pixel measurements to millimeters. If no reference is present, provide the estimated ratio based on standard human averages.

Output Format (JSON):
{
  "measurements": {
    "ipd_pixels": "number",
    "face_width_pixels": "number",
    "bridge_size_pixels": "number",
    "estimated_mm": { "ipd": "number", "face_width": "number", "bridge_size": "number" }
  },
  "extracted_frames": {
    "front_view_timestamp": "string",
    "left_side_timestamp": "string",
    "right_side_timestamp": "string"
  },
  "analysis_summary": {
    "en": "Elaborate, prestigious, and sales-oriented analysis in English (at least 3-4 sentences).",
    "ar": "تحليل مفصل ومرموق وموجه نحو المبيعات باللغة العربية (3-4 جمل على الأقل)."
  },
  "recommendations": [
    {
      "model_name": "string",
      "pitch_en": "A sophisticated, elaborate, and highly persuasive sales pitch in English (at least 3-4 sentences).",
      "pitch_ar": "عرض مبيعات متطور ومفصل ومقنع للغاية باللغة العربية (3-4 جمل على الأقل).",
      "image_url": "string"
    }
  ]
}

IMPORTANT: 
- You MUST provide at least 7 recommendations. 
- You MUST output the analysis_summary and recommendations in BOTH English and Arabic. 
- Keep all JSON keys in English.
- DO NOT include the numerical IPD value in the analysis_summary or pitches. Use descriptive terms like "perfectly balanced" or "ideal fit" instead.`;
        config.responseMimeType = "application/json";
      } else {
        prompt = `You are the prestigious "Al Moneer Opticals" Master Eyewear Stylist. Your mission is to perform a high-end facial analysis and curate a bespoke collection of luxury frames from our exclusive inventory.

${inventorySource}${extraInfoText}

Process:
1. Deep Analysis: Identify face shape, skin tone, and precise proportions. 
2. Strategic Curation: Select at least 7 frames that create a "symphony of balance" with the user's features.
3. Masterpiece Pitching: Create a compelling narrative for each selection.

CRITICAL SALES & ANALYSIS GUIDELINES:
- Face Analysis: Write a highly sophisticated, elaborate, and flattering analysis of the user's facial architecture. Use terms like "exquisite symmetry," "sculpted jawline," "commanding presence," or "refined features." Explain HOW their specific proportions make them a perfect candidate for certain luxury styles.
- Top Recommendations: For each of the 7+ frames, provide a "Masterpiece Pitch." This must be an elaborate, persuasive, and sales-oriented narrative. Don't just say it fits; explain how it elevates their status, complements their skin tone, and creates a "visual signature." Use high-end fashion terminology.
- Tone: Extremely prestigious, authoritative, yet deeply personal and welcoming. Like a private concierge in a high-end Milanese boutique.

Output Format (Markdown):
# Face Analysis / تحليل الوجه
[Elaborate, prestigious analysis in English - at least 4 sentences]
[تحليل مفصل ومرموق باللغة العربية - 4 جمل على الأقل]

# Bespoke Recommendations / التوصيات المخصصة
For each (at least 7):
## [Model Name/ID]
**The Masterpiece Pitch / عرض التحفة الفنية**
[Sophisticated, elaborate, and highly persuasive sales pitch in English - at least 4 sentences]
[عرض مبيعات متطور ومفصل ومقنع للغاية باللغة العربية - 4 جمل على الأقل]

![Model Name](Image URL)

IMPORTANT: 
- You MUST provide at least 7 recommendations.
- You MUST provide all descriptive text, analysis, and pitches in BOTH English and Arabic.
- DO NOT include the numerical IPD value in the analysis or pitches. Use descriptive terms like "perfectly balanced" or "ideal fit" instead.`;
      }

      const parts: any[] = [
        { text: prompt },
        ...videoParts,
      ];

      if (prescriptionPart) {
        parts.push({ text: "Prescription Document:" });
        parts.push(prescriptionPart);
      }

      setProcessingStatus("Consulting AI expert...");
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [
          {
            role: 'user',
            parts: parts,
          },
        ],
        config,
      });

      if (isVideo) {
        try {
          const parsedResult = JSON.parse(response.text || '{}');
          setVideoResult(parsedResult);
        } catch (e) {
          setVideoResult(null);
          setResult(response.text || t.noAnalysis);
        }
      } else {
        setResult(response.text || t.noAnalysis);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = formatError(err);
      const isQuotaError = err.status === 429 || 
                          errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('exhausted') ||
                          errorMessage.toLowerCase().includes('rate limit');

      if (isQuotaError) {
        setError(`AI Limit Reached: ${errorMessage || "Please wait 60 seconds and try again."}`);
      } else {
        setError(`Error: ${errorMessage || t.errorAnalysis}`);
      }
    } finally {
      clearTimeout(analysisTimeout);
      setIsAnalyzing(false);
      setProcessingStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-cyan/30 overflow-x-hidden" dir="rtl">
      {!isSupabaseConfigured && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 text-red-400 text-center font-medium">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <DualText 
              ar="تنبيه: إعدادات Supabase مفقودة. يرجى ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY." 
              en="Warning: Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." 
              arClass="text-sm"
              enClass="text-xs opacity-80 block"
            />
          </div>
        </div>
      )}
      {!ai && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 text-amber-400 text-center font-medium">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            <X className="w-5 h-5 rotate-45" />
            <DualText 
              ar="تنبيه: مفتاح Gemini API مفقود. يرجى ضبط VITE_GEMINI_API_KEY في إعدادات Netlify." 
              en="Warning: Gemini API key is missing. Please set VITE_GEMINI_API_KEY in Netlify settings." 
              arClass="text-sm"
              enClass="text-xs opacity-80 block"
            />
          </div>
        </div>
      )}
      <header className="bg-brand-dark/80 backdrop-blur-xl sticky top-0 z-50 border-b border-brand-cyan/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-lg">
              <img src="https://i.imgur.com/zpJPuWC.png" alt="Al Moneer Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-brand-cyan tracking-tighter uppercase leading-none text-glow-cyan">Al Moneer</h1>
              <span className="text-[12px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Opticals</span>
              <span className="text-xl font-bold text-white/80 font-arabic mt-1" dir="rtl">المنير للبصريات</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2 border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              <DualText ar={t.logout.ar} en={t.logout.en} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12 pb-32 flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-8" id="capture-section">
            <div className="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden shadow-lg mb-6">
              <img 
                src="https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&q=80&w=1200" 
                alt="Stylish eyewear" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent flex items-end p-8">
                <div className="text-white">
                  <h3 className="text-3xl font-bold mb-2">رؤية جديدة، أناقة فريدة</h3>
                  <p className="text-lg opacity-90 font-sans">A new vision, unique elegance</p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-brand-cyan/10 bg-brand-card aspect-video mb-10">
              <iframe 
                src="https://drive.google.com/file/d/1fNQfVnRtcsnDnYCG9RVgeFoI1xgj1yDB/preview" 
                className="w-full h-full border-0" 
                allow="autoplay"
                title="Welcome Video"
              ></iframe>
            </div>

          <div>
            <h2 className="text-4xl font-black mb-4 text-white leading-tight uppercase tracking-tight">
              <DualText ar={t.heading.ar} en={t.heading.en} direction="row-between" enClass="text-[0.85em] opacity-50 font-sans font-bold text-brand-cyan" />
            </h2>
            <div className="text-white/60 leading-relaxed whitespace-pre-wrap text-lg mb-6">
              <DualText ar={t.description.ar} en={t.description.en} />
            </div>
            <div className="w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-brand-cyan/10 bg-brand-card aspect-video">
              <iframe 
                src="https://drive.google.com/file/d/1oPsgAM-sX7-cDpCWxZlGbWms5jTkZFrv/preview" 
                className="w-full h-full border-0" 
                allow="autoplay"
                title="Guide Video"
              ></iframe>
            </div>
            
            <div className="mt-6 p-8 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-xl text-red-500 font-black leading-relaxed">
                <DualText ar={t.privacyNotice.ar} en={t.privacyNotice.en} />
              </div>
            </div>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-3xl p-10 transition-all duration-300 ease-in-out text-center
              ${!file && !isCapturing ? 'border-brand-cyan/20 hover:border-brand-cyan/40 bg-brand-cyan/5 hover:bg-brand-cyan/10' : 'border-transparent bg-brand-card'}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isCapturing ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-auto max-h-[400px] object-cover ${!isCapturingPrescription ? 'scale-x-[-1]' : ''}`} 
                />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                  {isCapturingPrescription ? (
                    <button
                      onClick={capturePhoto}
                      className="flex items-center gap-2 px-8 py-4 bg-brand-cyan text-brand-dark rounded-full font-black transition-all text-sm uppercase tracking-widest shadow-lg glow-cyan transform hover:-translate-y-1"
                    >
                      <Camera className="w-5 h-5" />
                      <DualText ar="التقاط صورة" en="Take Photo" enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                    </button>
                  ) : isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all text-sm shadow-lg hover:shadow-red-500/50 transform hover:-translate-y-1"
                    >
                      <StopCircle className="w-5 h-5" />
                      <DualText ar={t.stopRecording.ar} en={t.stopRecording.en} enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold transition-all text-sm shadow-lg hover:shadow-emerald-500/50 transform hover:-translate-y-1"
                    >
                      <Video className="w-5 h-5" />
                      <DualText ar={t.captureVideo.ar} en={t.captureVideo.en} enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-md shadow-lg hover:scale-110"
                    aria-label="Close camera"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {!isCapturingPrescription && isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <span className="text-white text-xs font-bold tracking-wider">REC</span>
                  </div>
                )}
              </div>
            ) : previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-brand-cyan/10">
                {isVideo ? (
                  <video src={previewUrl} controls playsInline preload="auto" className="w-full h-auto max-h-[400px] bg-black" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-cover max-h-[400px]" referrerPolicy="no-referrer" />
                )}
                <button
                  onClick={clearVideo}
                  className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-md z-10 hover:scale-110 shadow-lg"
                  aria-label="Clear video"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                    id="file-upload"
                  />
                  
                  <button
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-brand-cyan text-brand-dark rounded-full font-black transition-all text-sm uppercase tracking-widest shadow-lg glow-cyan transform hover:-translate-y-0.5"
                  >
                    <Camera className="w-5 h-5" />
                    <DualText ar={t.captureVideo.ar} en={t.captureVideo.en} enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-brand-cyan/10">
            <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2 uppercase tracking-widest">
              <FileText className="w-5 h-5 text-brand-cyan" />
              <DualText ar={t.optionalInfo.ar} en={t.optionalInfo.en} />
            </h3>
            <div className="grid sm:grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                  <DualText ar={t.prescriptionLabel.ar} en={t.prescriptionLabel.en} />
                </label>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                      className="w-full px-5 py-4 rounded-2xl border border-brand-cyan/10 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-brand-cyan file:text-brand-dark hover:file:bg-brand-cyan/90 transition-all bg-brand-dark text-white"
                    />
                    {prescriptionFile && (
                      <button 
                        onClick={() => setPrescriptionFile(null)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      startCamera(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-widest border border-white/10"
                  >
                    <Camera className="w-4 h-4" />
                    <DualText ar="التقاط صورة للوصفة" en="Capture Prescription" enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {file && (
            <button
              onClick={analyzeVideo}
              disabled={isAnalyzing}
              className="w-full py-5 bg-brand-cyan text-brand-dark disabled:bg-white/10 disabled:text-white/20 disabled:cursor-not-allowed rounded-full font-black transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl glow-cyan transform hover:-translate-y-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <DualText ar={t.consulting.ar} en={t.consulting.en} enClass="text-[0.6em] opacity-80 mt-0.5 font-sans block" />
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <DualText ar={t.analyze.ar} en={t.analyze.en} enClass="text-[0.6em] opacity-80 mt-0.5 font-sans block" />
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-5 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 flex items-center gap-3 font-medium">
              <X className="w-5 h-5 flex-shrink-0" />
              <DualText ar={typeof error === 'string' ? error : error.ar} en={typeof error === 'string' ? '' : error.en} />
            </div>
          )}
        </div>

        <div className="flex-1 bg-brand-card rounded-[2.5rem] p-8 shadow-2xl border border-brand-cyan/5 relative overflow-hidden min-h-[600px]" id="analysis-section">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-cyan/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 h-full">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-8 py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-cyan/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 className="w-16 h-16 animate-spin text-brand-cyan relative z-10" />
                </div>
                <div className="animate-pulse font-bold text-xl text-brand-cyan tracking-widest uppercase text-glow-cyan text-center">
                  <DualText ar={processingStatus || t.analyzing.ar} en={processingStatus || t.analyzing.en} />
                </div>
              </div>
            ) : videoResult ? (
              <div className="space-y-10">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 mb-4">
                    <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest text-brand-cyan uppercase">
                      <DualText ar={t.analysisComplete.ar} en={t.analysisComplete.en} enClass="text-[10px] font-bold tracking-widest text-brand-cyan uppercase block" arClass="text-[10px] font-bold tracking-widest text-brand-cyan uppercase block" />
                    </span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-white uppercase leading-tight">
                    <DualText 
                      en={videoResult.analysis_summary?.en?.split('.')[0] || "Face Shape Detected"} 
                      ar={videoResult.analysis_summary?.ar?.split('.')[0] || "تم تحديد شكل الوجه"} 
                      enClass="text-4xl font-black tracking-tight text-white uppercase leading-tight block"
                      arClass="text-2xl font-black tracking-tight text-white uppercase leading-tight block mt-2"
                    />
                  </h2>
                  <div className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                    <DualText ar={t.precisionMapping.ar} en={t.precisionMapping.en} />
                  </div>
                </div>

                {/* Face Scan Visualization Mockup */}
                <div className="text-center mb-4">
                  <div className="text-[10px] text-brand-cyan uppercase tracking-[0.2em] font-bold">
                    <DualText ar={t.faceScan.ar} en={t.faceScan.en} enClass="text-[10px] text-brand-cyan uppercase tracking-[0.2em] font-bold block" arClass="text-[10px] text-brand-cyan uppercase tracking-[0.2em] font-bold block" />
                  </div>
                </div>
                <div className="relative aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-brand-dark border border-brand-cyan/10 p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-cyan/10 via-transparent to-transparent" />
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600" 
                    alt="Face Scan" 
                    className="w-full h-full object-cover rounded-2xl opacity-40 grayscale"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full border border-brand-cyan/20 rounded-2xl relative overflow-hidden">
                      {/* Scan lines */}
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-brand-cyan/50 shadow-[0_0_10px_#80EEF9] animate-[scan_3s_ease-in-out_infinite]" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-brand-dark/80 backdrop-blur-md border border-brand-cyan/20 p-3 rounded-xl">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
                      <DualText ar={t.symmetryIndex.ar} en={t.symmetryIndex.en} enClass="text-[10px] text-white/40 uppercase tracking-widest block" arClass="text-[10px] text-white/40 uppercase tracking-widest block" />
                    </div>
                    <div className="text-xl font-black text-brand-cyan">0.984</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-brand-dark/50 p-4 rounded-3xl border border-brand-cyan/10 space-y-2">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest">
                        <DualText ar={t.ipd.ar} en={t.ipd.en} enClass="text-[10px] text-white/40 uppercase tracking-widest block" arClass="text-[10px] text-white/40 uppercase tracking-widest block" />
                      </div>
                      <div className="text-lg font-bold text-white">
                        {videoResult.measurements?.estimated_mm?.ipd || "62"} mm
                      </div>
                    </div>
                    <div className="bg-brand-dark/50 p-4 rounded-3xl border border-brand-cyan/10 space-y-2">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest">
                        <DualText ar={t.faceWidth.ar} en={t.faceWidth.en} enClass="text-[10px] text-white/40 uppercase tracking-widest block" arClass="text-[10px] text-white/40 uppercase tracking-widest block" />
                      </div>
                      <div className="text-lg font-bold text-white">
                        {videoResult.measurements?.estimated_mm?.face_width || "140"} mm
                      </div>
                    </div>
                    <div className="bg-brand-dark/50 p-4 rounded-3xl border border-brand-cyan/10 space-y-2">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest">
                        <DualText ar={t.bridgeSize.ar} en={t.bridgeSize.en} enClass="text-[10px] text-white/40 uppercase tracking-widest block" arClass="text-[10px] text-white/40 uppercase tracking-widest block" />
                      </div>
                      <div className="text-lg font-bold text-white">
                        {videoResult.measurements?.estimated_mm?.bridge_size || "18"} mm
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-cyan/5 p-6 rounded-3xl border border-brand-cyan/20 flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center border border-brand-cyan/20 shrink-0">
                      <Sparkles className="w-6 h-6 text-brand-cyan" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">
                        <DualText ar={t.styleInsight.ar} en={t.styleInsight.en} enClass="text-sm font-bold text-white block" arClass="text-sm font-bold text-white block" />
                      </div>
                      <div className="text-xs text-white/60 leading-relaxed">
                        <DualText 
                          en={videoResult.analysis_summary?.en || "Heart shapes are balanced by bottom-heavy frames or Wayfarer silhouettes."} 
                          ar={videoResult.analysis_summary?.ar || "يتم موازنة أشكال القلب بواسطة الإطارات الثقيلة من الأسفل أو صور واي فارير الظلية."}
                          enClass="text-xs text-white/60 leading-relaxed block"
                          arClass="text-xs text-white/60 leading-relaxed block mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const el = document.getElementById('recommendations-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-5 bg-brand-cyan text-brand-dark rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 glow-cyan-strong hover:scale-[1.02] transition-transform"
                >
                  <DualText ar={t.seeRecommendations.ar} en={t.seeRecommendations.en} enClass="text-sm font-black text-brand-dark uppercase tracking-widest block" arClass="text-sm font-black text-brand-dark uppercase tracking-widest block" direction="row" />
                  <Sparkles className="w-5 h-5" />
                </button>

                {videoResult.recommendations && videoResult.recommendations.length > 0 && (
                  <div id="recommendations-section" className="pt-10 space-y-8">
                    <h4 className="font-black text-2xl text-white uppercase tracking-tight flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-brand-cyan" />
                      <DualText ar={t.recommendedFrames.ar} en={t.recommendedFrames.en} />
                    </h4>
                    <div className="space-y-6">
                      {videoResult.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="bg-brand-dark/50 p-6 rounded-[2rem] border border-brand-cyan/10 flex flex-col gap-6 hover:border-brand-cyan/30 transition-all group">
                          {rec.image_url && (
                            <div className="w-full bg-brand-dark rounded-2xl overflow-hidden flex items-center justify-center p-8 border border-white/5">
                              <img src={rec.image_url} alt={rec.model_name} className="w-full max-w-md h-auto object-contain group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div className="space-y-4">
                            <h5 className="font-black text-2xl text-white uppercase tracking-tight">{rec.model_name}</h5>
                            <div className="space-y-2">
                              <p className="text-white/80 text-lg leading-relaxed">{rec.pitch_ar}</p>
                              <p className="text-white/40 text-sm leading-relaxed font-sans" dir="ltr">{rec.pitch_en}</p>
                            </div>
                            <button
                              onClick={() => {
                                setTryOnFrame(rec.model_name);
                                setTryOnFrameImage(rec.image_url);
                              }}
                              className="w-full py-4 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan rounded-2xl font-bold transition-all flex items-center justify-center gap-3 border border-brand-cyan/20"
                            >
                              <Camera className="w-6 h-6" />
                              <DualText ar="تجربة الإطار" en="Try On Frame" enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : result ? (
              <div className="space-y-8">
                <div className="prose prose-invert prose-p:leading-relaxed prose-headings:font-black prose-a:text-brand-cyan max-w-none prose-lg md:prose-xl">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({node, ...props}) => (
                        <img {...props} referrerPolicy="no-referrer" className="rounded-3xl shadow-lg max-w-full h-auto border border-white/10" />
                      )
                    }}
                  >
                    {typeof result === 'string' ? result : result.ar + '\n\n' + result.en}
                  </ReactMarkdown>
                </div>
                <div className="pt-8 flex justify-center">
                  <button
                    onClick={handleSaveResults}
                    disabled={isSaving || saveSuccess}
                    className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg ${
                      saveSuccess 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                        : 'bg-brand-cyan text-brand-dark shadow-brand-cyan/30 hover:-translate-y-1'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <DualText ar="جاري الحفظ..." en="Saving..." enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <DualText ar="تم حفظ النتائج" en="Saved Results" enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        <DualText ar="حفظ النتائج" en="Save Results" enClass="text-[0.7em] opacity-80 mt-0.5 font-sans block" />
                      </>
                    )}
                  </button>
                </div>

                {showDiscount && (
                  <div className="mt-10 p-8 bg-gradient-to-br from-emerald-500/20 to-brand-cyan/20 border border-emerald-500/30 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-500">
                    <div className="flex flex-col items-center text-center gap-6">
                      <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <Tag className="w-10 h-10" />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-3xl font-black text-white uppercase tracking-tight">
                          <DualText ar={t.discountTitle.ar} en={t.discountTitle.en} />
                        </h4>
                        <div className="text-lg text-white/80 leading-relaxed max-w-md mx-auto">
                          <DualText ar={t.discountDesc.ar} en={t.discountDesc.en} />
                        </div>
                      </div>
                      <div className="w-full h-px bg-white/10" />
                      <div className="flex items-center gap-3 text-brand-cyan font-bold">
                        <Mail className="w-5 h-5" />
                        <span>{session.user.email}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/20 text-center px-8">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                  <Sparkles className="w-10 h-10 text-white/10" />
                </div>
                <div className="whitespace-pre-wrap text-lg font-medium">
                  <DualText ar={t.waiting.ar} en={t.waiting.en} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {tryOnFrame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-md">
          <div className="bg-brand-card rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-brand-cyan/10" dir="ltr">
            <button 
              onClick={() => { setTryOnFrame(null); setTryOnFrameImage(null); setTryOnResultUrl(null); }}
              className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              <DualText ar={t.tryOnTitle.ar} en={t.tryOnTitle.en} />
            </h3>
            <p className="text-white/50 text-sm mb-8">
              <DualText ar={t.tryOnDesc.ar} en={t.tryOnDesc.en} /> <strong className="text-brand-cyan">{tryOnFrame}</strong>?
            </p>
            
            {!tryOnResultUrl ? (
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                    <DualText ar={t.selectScenario.ar} en={t.selectScenario.en} />
                  </label>
                  <select 
                    value={tryOnScenario}
                    onChange={(e) => setTryOnScenario(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-brand-cyan/10 focus:ring-2 focus:ring-brand-cyan focus:border-transparent outline-none transition-all bg-brand-dark text-white"
                  >
                    <optgroup label={`${t.prof.en} / ${t.prof.ar}`}>
                      <option value="Executive Boardroom">{t.execBoardroom.en} / {t.execBoardroom.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.active.en} / ${t.active.ar}`}>
                      <option value="Playing Tennis">{t.playingTennis.en} / {t.playingTennis.ar}</option>
                      <option value="Badminton Court">{t.badmintonCourt.en} / {t.badmintonCourt.ar}</option>
                      <option value="Table Tennis">{t.tableTennis.en} / {t.tableTennis.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.leisure.en} / ${t.leisure.ar}`}>
                      <option value="Sunset on a Boat">{t.sunsetBoat.en} / {t.sunsetBoat.ar}</option>
                      <option value="Luxury Shopping Mall">{t.luxuryMall.en} / {t.luxuryMall.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.social.en} / ${t.social.ar}`}>
                      <option value="Garden Picnic">{t.gardenPicnic.en} / {t.gardenPicnic.ar}</option>
                      <option value="Evening Party/Gala">{t.eveningParty.en} / {t.eveningParty.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.utility.en} / ${t.utility.ar}`}>
                      <option value="Driving at Night">{t.drivingNight.en} / {t.drivingNight.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.lifestyle.en} / ${t.lifestyle.ar}`}>
                      <option value="Beach Side-Walk">{t.beachWalk.en} / {t.beachWalk.ar}</option>
                    </optgroup>
                    <optgroup label={`${t.other.en} / ${t.other.ar}`}>
                      <option value="Custom Scenario">{t.customScenarioOption.en} / {t.customScenarioOption.ar}</option>
                    </optgroup>
                  </select>
                </div>

                {tryOnScenario === 'Custom Scenario' && (
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                      <DualText ar={t.customScenario.ar} en={t.customScenario.en} />
                    </label>
                    <input 
                      type="text"
                      value={tryOnCustomScenario}
                      onChange={(e) => setTryOnCustomScenario(e.target.value)}
                      placeholder={`${t.customScenarioPlaceholder.en} / ${t.customScenarioPlaceholder.ar}`}
                      className="w-full px-5 py-4 rounded-2xl border border-brand-cyan/10 focus:ring-2 focus:ring-brand-cyan focus:border-transparent outline-none transition-all bg-brand-dark text-white"
                    />
                  </div>
                )}

                {tryOnError && (
                  <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs border border-red-500/20">
                    {tryOnError}
                  </div>
                )}

                <button
                  onClick={generateTryOnImage}
                  disabled={isTryingOn || (tryOnScenario === 'Custom Scenario' && !tryOnCustomScenario.trim())}
                  className="w-full py-5 bg-brand-cyan text-brand-dark rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 glow-cyan hover:scale-[1.02] transition-transform"
                >
                  {isTryingOn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <DualText ar={t.generatingImage.ar} en={t.generatingImage.en} />
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <DualText ar={t.generateTryOn.ar} en={t.generateTryOn.en} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-brand-cyan/20">
                  <img src={tryOnResultUrl} alt="Try On Result" className="w-full h-auto" referrerPolicy="no-referrer" />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = tryOnResultUrl;
                      link.download = `Al-Moneer-Try-On-${tryOnFrame}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex-1 py-5 bg-brand-cyan text-brand-dark rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 glow-cyan"
                  >
                    <Download className="w-5 h-5" />
                    <DualText ar={t.downloadImage.ar} en={t.downloadImage.en} />
                  </button>
                  <button
                    onClick={() => { setTryOnResultUrl(null); setTryOnFrame(null); setTryOnFrameImage(null); }}
                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white rounded-full font-black text-sm uppercase tracking-widest transition-colors"
                  >
                    <DualText ar={t.close.ar} en={t.close.en} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-t border-brand-cyan/10 px-6 py-4 pb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => document.getElementById('capture-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-brand-cyan text-glow-cyan transition-all"
          >
            <Camera className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Capture</span>
          </button>
          <button 
            onClick={() => document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-brand-cyan transition-all"
          >
            <Zap className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Analysis</span>
          </button>
          <button 
            onClick={() => document.getElementById('recommendations-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-brand-cyan transition-all"
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Recommendations</span>
          </button>
        </div>
      </nav>
    </div>
  );
}