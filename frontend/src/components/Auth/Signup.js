// import { useState } from "react";
// import { Link } from "react-router-dom";
// import "./auth.css";

// function Signup() {
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     password: "",
//   });

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log("SIGNUP:", formData);
//   };

//   return (
//     <div className="container">
//       <div className="left">
//         <h1>Join Us at TaleTeller</h1>
//         <p>Create an account and start your Writing journey with us.</p>
//       </div>

//       <div className="right">
//         <h2>Sign Up</h2>

//         <form onSubmit={handleSubmit}>
//           <input
//             type="text"
//             name="name"
//             placeholder="Full Name"
//             onChange={handleChange}
//             required
//           />

//           <input
//             type="email"
//             name="email"
//             placeholder="Email"
//             onChange={handleChange}
//             required
//           />

//           <input
//             type="password"
//             name="password"
//             placeholder="Password"
//             onChange={handleChange}
//             required
//           />

//           <button type="submit">Create Account</button>
//         </form>

//         <p className="switch">
//           Already have an account? <Link to="/login">Login</Link>
//         </p>
//       </div>
//     </div>
//   );
// }

// export default Signup;


// frontend/src/components/Auth/Signup.js
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

function Signup({ setUser }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ======= MOCK SIGNUP =======
    // Replace this with your backend API call
    const newUser = {
      name: formData.name,
      email: formData.email,
      darkMode: false, // default
    };

    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));

    // Redirect to home after signup
    navigate("/");
  };

  return (
    <div className="container">
      <div className="left">
        <h1>Join Us at TaleTeller</h1>
        <p>Create an account and start your writing journey with us.</p>
      </div>

      <div className="right">
        <h2>Sign Up</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />

          <button type="submit">Create Account</button>
        </form>

        <p className="switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
