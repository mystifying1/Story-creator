// import { useState } from "react";
// import { Link } from "react-router-dom";
// import "./auth.css";

// function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log("LOGIN:", email, password);
//   };

//   return (
//     <div className="container">
//       <div className="left">
//         <h1>Welcome Back!</h1>
//         <p>Login to continue accessing your dashboard.</p>
//       </div>

//       <div className="right">
//         <h2>Login</h2>

//         <form onSubmit={handleSubmit}>
//           <input
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />

//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />

//           <button type="submit">Login</button>
//         </form>

//         <p className="switch">
//           Don’t have an account? <Link to="/signup">Sign up</Link>
//         </p>
//       </div>
//     </div>
//   );
// }

// export default Login;


// frontend/src/components/Auth/Login.js
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // ======= MOCK AUTH =======
    // In a real app, call your backend API here
    const loggedInUser = {
      name: "Demo User",
      email,
      darkMode: false, // default
    };

    setUser(loggedInUser);
    localStorage.setItem("user", JSON.stringify(loggedInUser));

    // Redirect to home after login
    navigate("/");
  };

  return (
    <div className="container">
      <div className="left">
        <h1>Welcome Back!</h1>
        <p>Login to continue accessing your dashboard.</p>
      </div>

      <div className="right">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        <p className="switch">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
