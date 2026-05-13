import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

const StarRating = ({ rating, setRating, readonly = false }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readonly && setRating(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{
            fontSize: "36px",
            cursor: readonly ? "default" : "pointer",
            color: star <= (hovered || rating) ? "#F59E0B" : "#E2E8F0",
            transition: "color 0.15s"
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ratingLabels = {
  1: "Poor",
  2: "Fair", 
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};

const LectureReview = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { state } = useLocation();
  const courseName = state?.courseName || "Course";
  const lectureNumber = state?.lectureNumber || "";

  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating before submitting.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) { navigate("/login"); return; }

      // تحقق لو الطالب عمل review قبل كده لنفس الـ session
      const existing = await getDocs(
        query(
          collection(db, "reviews"),
          where("studentId", "==", user.uid),
          where("sessionId", "==", sessionId)
        )
      );

      if (!existing.empty) {
        setError("You have already submitted a review for this lecture.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "reviews"), {
        studentId:  user.uid,
        sessionId,
        rating,
        comment:    comment.trim(),
        createdAt:  new Date(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          backgroundColor: "white", borderRadius: "20px",
          padding: "60px 80px", textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", maxWidth: "480px"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🎉</div>
          <h2 style={{ color: "#173B66", fontSize: "24px", fontWeight: "700", margin: "0 0 12px 0" }}>
            Thank you for your feedback!
          </h2>
          <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "32px" }}>
            Your review for <strong>{courseName}</strong> — Lecture #{lectureNumber} has been submitted.
          </p>
          <div style={{
            backgroundColor: "#FEF9C3", borderRadius: "12px",
            padding: "16px", marginBottom: "32px",
            display: "flex", justifyContent: "center", gap: "4px"
          }}>
            <StarRating rating={rating} setRating={() => {}} readonly />
            <span style={{ marginLeft: "8px", color: "#92400E", fontWeight: "700", fontSize: "16px" }}>
              {ratingLabels[rating]}
            </span>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: "#173B66", color: "white", border: "none",
              padding: "12px 40px", borderRadius: "10px", cursor: "pointer",
              fontWeight: "700", fontSize: "15px", width: "100%"
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Navbar */}
      <div style={{
        backgroundColor: "white", padding: "20px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "16px", color: "#173B66", fontWeight: "600"
        }}>
          ← Back
        </button>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#173B66" }}>
          Lecture Review
        </span>
        <div style={{ width: "60px" }} />
      </div>

      <div style={{
        maxWidth: "600px", margin: "60px auto", padding: "0 24px"
      }}>
        {/* Header Card */}
        <div style={{
          backgroundColor: "#173B66", borderRadius: "16px",
          padding: "28px 36px", marginBottom: "24px", color: "white"
        }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "1px" }}>
            Reviewing
          </p>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700" }}>
            {courseName}
          </h2>
          {lectureNumber && (
            <span style={{
              backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "8px",
              padding: "4px 14px", fontSize: "13px", fontWeight: "600"
            }}>
              Lecture #{lectureNumber}
            </span>
          )}
        </div>

        {/* Review Form */}
        <div style={{
          backgroundColor: "white", borderRadius: "16px",
          padding: "36px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
        }}>
          {/* Rating */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{
              margin: "0 0 16px 0", fontSize: "15px",
              fontWeight: "700", color: "#1E293B"
            }}>
              How would you rate this lecture?
            </p>
            <StarRating rating={rating} setRating={setRating} />
            {rating > 0 && (
              <p style={{
                margin: "10px 0 0 0", fontSize: "14px",
                color: "#F59E0B", fontWeight: "600"
              }}>
                {ratingLabels[rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{
              margin: "0 0 12px 0", fontSize: "15px",
              fontWeight: "700", color: "#1E293B"
            }}>
              Comments <span style={{ color: "#94A3B8", fontWeight: "400" }}>(optional)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this lecture..."
              maxLength={500}
              rows={5}
              style={{
                width: "100%", padding: "14px 16px",
                border: "1px solid #E2E8F0", borderRadius: "10px",
                fontSize: "14px", color: "#1E293B",
                resize: "vertical", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
                lineHeight: "1.6"
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#94A3B8", textAlign: "right" }}>
              {comment.length} / 500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: "#FEE2E2", border: "1px solid #EF4444",
              borderRadius: "8px", padding: "12px 16px",
              marginBottom: "20px", color: "#991B1B", fontSize: "14px"
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            style={{
              width: "100%", backgroundColor: rating === 0 ? "#94A3B8" : "#173B66",
              color: "white", border: "none", padding: "14px",
              borderRadius: "10px", cursor: rating === 0 ? "not-allowed" : "pointer",
              fontWeight: "700", fontSize: "16px",
              transition: "background 0.2s"
            }}
          >
            {loading ? "Submitting..." : "Submit Review ✓"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LectureReview;