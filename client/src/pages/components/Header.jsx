import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaUser, FaBars, FaTimes } from "react-icons/fa";
import defaultProfileImg from "../../assets/images/profile.png";
// import CustomizationModal from "./CustomizationModal";
import Logo from "../../assets/images/tm-logo.png";
import TravelChatbot from "./TravelChatbot";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    <header className=" w-full z-50">
      <nav className="bg-black text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              {/* <h1 className="font-bold text-2xl text-white">Travel Mate</h1> */}
              <img src={Logo} alt="Logo" className="w-[80px] h-auto" />
            </Link>

            {/* Desktop Navigation - Centered */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <ul className="flex space-x-8">
                <li>
                  <Link
                    to="/"
                    className="hover:text-blue-400 transition duration-300"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search"
                    className="hover:text-blue-400 transition duration-300"
                  >
                    Packages
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="hover:text-blue-400 transition duration-300"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-blue-400 transition duration-300"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <button
                    onClick={toggleChatbot}
                    className="hover:text-blue-400 transition duration-300"
                  >
                    Customize
                  </button>
                </li>
              </ul>
            </div>

            {/* Profile Section */}
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <Link
                  to={currentUser.user_role === 1 ? "/admin-dashboard" : "/profile"}
                  className="flex items-center space-x-2 hover:text-blue-400 transition duration-300"
                >
                  <FaUser className="text-xl" />
                  <span className="hidden sm:inline">{currentUser.username}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-2 hover:text-blue-400 transition duration-300"
                >
                  <FaUser className="text-xl" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white focus:outline-none"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4">
              <ul className="flex flex-col space-y-4">
                <li>
                  <Link
                    to="/"
                    className="block hover:text-blue-400 transition duration-300"
                    onClick={toggleMenu}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search"
                    className="block hover:text-blue-400 transition duration-300"
                    onClick={toggleMenu}
                  >
                    Packages
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="block hover:text-blue-400 transition duration-300"
                    onClick={toggleMenu}
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="block hover:text-blue-400 transition duration-300"
                    onClick={toggleMenu}
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      toggleChatbot();
                      toggleMenu();
                    }}
                    className="block hover:text-blue-400 transition duration-300"
                  >
                    Customize
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </nav>
      <TravelChatbot isOpen={isChatbotOpen} onClose={toggleChatbot} />
    </header>
  );
};

export default Header;
