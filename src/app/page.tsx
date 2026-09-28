import React from 'react';

export default function HomePage() {
  return (
    <main className="main-wrapper">
      <div className="container">
        <h1 className="title">classmate</h1>
        <p className="description">
          A modern, minimal collaborative platform built for students and educators to share knowledge, organize study resources, and connect with peers seamlessly.
        </p>
      </div>

      <style jsx>{`
        .main-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background-color: var(--bg-primary);
        }
        .container {
          max-width: 600px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }
        .title {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .description {
          font-size: 1.15rem;
          color: var(--text-secondary);
          line-height: 1.65;
          font-weight: 400;
          max-width: 520px;
        }
        @media (max-width: 640px) {
          .title {
            font-size: 2.25rem;
          }
          .description {
            font-size: 1rem;
          }
        }
      `}</style>
    </main>
  );
}
