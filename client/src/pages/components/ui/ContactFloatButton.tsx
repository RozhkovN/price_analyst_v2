import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaTelegramPlane,
  FaTimes,
} from "react-icons/fa";

const ContactFloatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const phoneNumber = "8(909) 980-01-88";
  const email = "sale@supplyx.ru";
  const telegram = "t.me/Supprice_bot";

  const handleTelegramClick = () => {
    window.open(`https://${telegram}`, "_blank");
  };

  return (
    <div className="fixed right-6 bottom-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 bottom-16 mb-4 flex flex-col gap-3"
          >
            {/* Telegram */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="group flex cursor-pointer items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-white shadow-lg select-none hover:shadow-xl"
              onClick={handleTelegramClick}
            >
              <FaTelegramPlane size={23} />
              <span className="text-md font-medium whitespace-nowrap select-text">
                Telegram
              </span>
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              whileHover={{ scale: 1.05 }}
              className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-5 py-3 text-white shadow-lg select-none hover:shadow-xl"
            >
              <FaEnvelope size={20} />
              <span className="text-md font-medium whitespace-nowrap select-text">
                {email}
              </span>
            </motion.div>

            {/* Phone */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-3 text-white shadow-lg select-none hover:shadow-xl"
            >
              <FaPhoneAlt size={20} />
              <span className="text-md font-medium whitespace-nowrap select-text">
                {phoneNumber}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Основная кнопка */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="hover:shadow-3xl flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/30"
      >
        {isOpen ? (
          <FaTimes size={26} />
        ) : (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <FaPhoneAlt size={26} />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
};

export default ContactFloatButton;
