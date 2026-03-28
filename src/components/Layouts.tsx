import { motion } from "motion/react";

interface LayoutProps {
  images: string[];
  filter?: string;
  onImageClick?: (index: number, images: string[]) => void;
}

const getFilterClass = (filter?: string) => {
  switch (filter) {
    case "Vintage": return "sepia-[0.4] contrast-[1.1] brightness-[0.9] hue-rotate-[-10deg]";
    case "Black and White": return "grayscale";
    case "Sepia": return "sepia";
    default: return "";
  }
};

export const BalancedLayout = ({ images, filter, onImageClick }: LayoutProps) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {images.map((img, idx) => (
      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: idx * 0.1 }}
        className="aspect-square overflow-hidden rounded-[20px] shadow-sm cursor-pointer"
        onClick={() => onImageClick?.(idx, images)}
      >
        <img 
          src={img} 
          alt="" 
          className={`h-full w-full object-cover transition-transform duration-500 hover:scale-110 ${getFilterClass(filter)}`} 
          referrerPolicy="no-referrer" 
        />
      </motion.div>
    ))}
  </div>
);

export const HeroLayout = ({ images, filter, onImageClick }: LayoutProps) => (
  <div className="space-y-3">
    <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="h-[400px] overflow-hidden rounded-[28px] shadow-md cursor-pointer"
        onClick={() => onImageClick?.(0, images)}
      >
        <img src={images[0]} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
      </motion.div>
      <div className="grid grid-cols-2 gap-3">
        {images.slice(1, 5).map((img, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="h-[193px] overflow-hidden rounded-[22px] shadow-sm cursor-pointer"
            onClick={() => onImageClick?.(idx + 1, images)}
          >
            <img src={img} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
          </motion.div>
        ))}
        {images.length > 1 && images.length < 5 && Array.from({ length: 5 - images.length }).map((_, i) => (
          <div key={`empty-${i}`} className="h-[193px] rounded-[22px] bg-[#f6f2eb] border border-dashed border-[#d8cfc2]" />
        ))}
      </div>
    </div>
    {images.length > 5 && (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.slice(5).map((img, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="aspect-square overflow-hidden rounded-[20px] shadow-sm cursor-pointer"
            onClick={() => onImageClick?.(idx + 5, images)}
          >
            <img src={img} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

export const CollageLayout = ({ images, filter, onImageClick }: LayoutProps) => (
  <div className="relative min-h-[500px] w-full overflow-hidden rounded-[32px] bg-[#faf7f2] p-8">
    <div className="flex flex-wrap gap-8 justify-center">
      {images.map((img, idx) => {
        const rotations = [-5, 3, -2, 4, -3, 2, -4, 5];
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: rotations[idx % rotations.length] }}
            transition={{ delay: idx * 0.1, type: "spring" }}
            className="relative h-64 w-48 overflow-hidden rounded-[12px] border-8 border-white shadow-xl flex-shrink-0 cursor-pointer"
            onClick={() => onImageClick?.(idx, images)}
          >
            <img src={img} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
          </motion.div>
        );
      })}
    </div>
  </div>
);

export const StoryLayout = ({ images, filter, onImageClick }: LayoutProps) => (
  <div className="mx-auto max-w-2xl space-y-6">
    {images.map((img, idx) => (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
        onClick={() => onImageClick?.(idx, images)}
      >
        <img src={img} alt="" className={`w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
      </motion.div>
    ))}
  </div>
);

export const SplitLayout = ({ images, filter, onImageClick }: LayoutProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-12 gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-8 h-[350px] overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
        onClick={() => onImageClick?.(0, images)}
      >
        <img src={images[0]} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
      </motion.div>
      {images[1] && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-4 h-[350px] overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
          onClick={() => onImageClick?.(1, images)}
        >
          <img src={images[1]} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
        </motion.div>
      )}
      {images[2] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-4 h-[200px] overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
          onClick={() => onImageClick?.(2, images)}
        >
          <img src={images[2]} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
        </motion.div>
      )}
      {images[3] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-8 h-[200px] overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
          onClick={() => onImageClick?.(3, images)}
        >
          <img src={images[3]} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
        </motion.div>
      )}
    </div>
    {images.length > 4 && (
      <div className="grid grid-cols-3 gap-4">
        {images.slice(4).map((img, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="aspect-video overflow-hidden rounded-[24px] shadow-sm cursor-pointer"
            onClick={() => onImageClick?.(idx + 4, images)}
          >
            <img src={img} alt="" className={`h-full w-full object-cover ${getFilterClass(filter)}`} referrerPolicy="no-referrer" />
          </motion.div>
        ))}
      </div>
    )}
  </div>
);
