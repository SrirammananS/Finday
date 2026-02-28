import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * Scroll-triggered reveal component.
 * Animates children when they enter the viewport.
 * Uses Framer Motion useInView - works with any scroll container.
 */
const defaultVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
      staggerChildren: 0.08,
      when: 'beforeChildren',
    },
  },
};

const tagMap = { div: motion.div, section: motion.section, article: motion.article, header: motion.header };

const ScrollReveal = ({
  children,
  className = '',
  as = 'div',
  variants = defaultVariants,
  once = true,
  amount = 0.15,
  ...props
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });

  const Component = tagMap[as] || motion.div;

  return (
    <Component
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
