import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';  

const items = [
  { id: 1, content: "Igniting Helium God Mode intelligence..." },
  { id: 2, content: "Calibrating cognition streams..." },
  { id: 3, content: "Synchronizing agent constellation..." },
  { id: 4, content: "Aligning multi-domain vectors..." },
  { id: 5, content: "Infusing strategic clarity into the lens..." },
  { id: 6, content: "Composing orchestration layers..." },
  { id: 7, content: "Activating intelligence harmonics..." },
  { id: 8, content: "Refining delegation protocols..." },
  { id: 9, content: "Energizing agent matrix..." },
  { id: 10, content: "Mapping adaptive workflows..." },
  { id: 11, content: "Optimizing resonance fields..." },
  { id: 12, content: "Unifying operational streams..." },
  { id: 13, content: "Translating complexity into clarity..." },
  { id: 14, content: "Preparing deployment cadence..." },
  { id: 15, content: "Crystallizing master intelligence..." },
  { id: 16, content: "Launching Helium convergence protocol..." }
];

export const AgentLoader = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((state) => {
        if (state >= items.length - 1) return 0;
        return state + 1;
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex py-2 items-center w-full">
      <AnimatePresence>
      <motion.div
          key={items[index].id}
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -20, opacity: 0, filter: "blur(8px)" }}
          transition={{ ease: "easeInOut" }}
          style={{ position: "absolute" }}
          className='ml-7'
      >
          <AnimatedShinyText className='text-xs'>{items[index].content}</AnimatedShinyText>
      </motion.div>
      </AnimatePresence>
    </div>
  );
};
