"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { IDENTITY } from "@/config/identity";

interface Hierarchy {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
}

interface ProcessingResult {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
}

// Recursive component to render tree branches
function TreeNodeRender({ nodeName, childrenObj }: { nodeName: string; childrenObj: Record<string, unknown> }) {
  const childKeys = Object.keys(childrenObj);

  return (
    <div className={styles.treeNodeItem}>
      <div className={styles.nodeCircle}>{nodeName}</div>
      {childKeys.length > 0 && (
        <div className={styles.treeBranch}>
          {childKeys.map(child => (
            <TreeNodeRender key={child} nodeName={child} childrenObj={childrenObj[child] as Record<string, unknown>} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // Pre-populate input with the PDF example data
  const defaultInput = `{\n  "data": [\n    "A->B", "A->C", "B->D", "C->E", "E->F",\n    "X->Y", "Y->Z", "Z->X",\n    "P->Q", "Q->R",\n    "G->H", "G->H", "G->I",\n    "hello", "1->2", "A->"\n  ]\n}`;
  
  const [inputStr, setInputStr] = useState(defaultInput);
  const [apiResponse, setApiResponse] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");
  const [isJsonValid, setIsJsonValid] = useState(true);

  // Validate JSON string on change
  useEffect(() => {
    try {
      JSON.parse(inputStr);
      setIsJsonValid(true);
    } catch {
      setIsJsonValid(false);
    }
  }, [inputStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(inputStr);
      } catch {
        throw new Error("Input must be a valid JSON object.");
      }

      if (!parsedData || typeof parsedData !== "object" || !("data" in parsedData)) {
        throw new Error("JSON must contain a 'data' array field. Format: { 'data': [...] }");
      }

      if (!Array.isArray(parsedData.data)) {
        throw new Error("The 'data' field must be an array of strings.");
      }

      // API request to Next.js route handler /bfhl
      const res = await fetch("/bfhl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }

      setApiResponse(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please check your connection and API route.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        
        {/* Header Section */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>C</div>
              <div>
                <h1 className={styles.title}>Chitkara Hierarchy Visualizer</h1>
                <p className={styles.subtitle}>REST API & Graph Processing Dashboard</p>
              </div>
            </div>

            {/* Student Identity Information */}
            <div className={styles.identityCard}>
              <div className={styles.identityItem}>
                <span className={styles.identityLabel}>User ID</span>
                <span className={styles.identityValue}>{IDENTITY.user_id}</span>
              </div>
              <div className={styles.identityItem}>
                <span className={styles.identityLabel}>College Email</span>
                <span className={styles.identityValue}>{IDENTITY.email_id}</span>
              </div>
              <div className={styles.identityItem}>
                <span className={styles.identityLabel}>Roll Number</span>
                <span className={styles.identityValue}>{IDENTITY.college_roll_number}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className={styles.grid}>
          
          {/* Left Column: Input and Details */}
          <div className={styles.sidebar}>
            
            {/* Input Card */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Node List Input
              </h2>
              
              <form onSubmit={handleSubmit} className={styles.formGroup}>
                <label className={styles.label}>
                  Enter Graph Edges JSON Array:
                  {!isJsonValid && <span style={{ color: "#ef4444", marginLeft: "10px", fontSize: "0.8rem" }}>Invalid JSON</span>}
                </label>
                <textarea
                  className={styles.textarea}
                  value={inputStr}
                  onChange={(e) => setInputStr(e.target.value)}
                  placeholder={`{\n  "data": ["A->B", "A->C"]\n}`}
                />
                
                <button 
                  type="submit" 
                  className={styles.btn} 
                  disabled={loading || !isJsonValid}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      Process Hierarchies
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className={styles.errorBanner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{error}</span>
                </div>
              )}
            </section>

            {/* Validation & Cleanups Card */}
            {apiResponse && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Edge Validation Logs
                </h2>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Invalid Entries ({apiResponse.invalid_entries.length})
                  </label>
                  {apiResponse.invalid_entries.length > 0 ? (
                    <div className={styles.edgeList}>
                      {apiResponse.invalid_entries.map((entry, index) => (
                        <span key={index} className={`${styles.edgeItem} ${styles.edgeItemInvalid}`}>
                          {entry}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0" }}>None detected.</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Duplicate Edges ({apiResponse.duplicate_edges.length})
                  </label>
                  {apiResponse.duplicate_edges.length > 0 ? (
                    <div className={styles.edgeList}>
                      {apiResponse.duplicate_edges.map((entry, index) => (
                        <span key={index} className={`${styles.edgeItem} ${styles.edgeItemDuplicate}`}>
                          {entry}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0" }}>None detected.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Visualizer and Statistics */}
          <div className={styles.outputArea}>
            
            {/* Show Empty State if no API response yet */}
            {!apiResponse ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateTitle}>No Graph Processed Yet</div>
                <div className={styles.emptyStateDesc}>
                  Enter your node edge relationships in JSON format on the left and click &quot;Process Hierarchies&quot; to reconstruct trees and cycles.
                </div>
              </div>
            ) : (
              <>
                {/* Summary Metrics */}
                <section className={styles.stats}>
                  
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Valid Trees</span>
                    <span className={`${styles.statValue} ${styles.statValueTrees}`}>
                      {apiResponse.summary.total_trees}
                    </span>
                    <span className={styles.statDetail}>Non-cyclic graphs</span>
                  </div>

                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Cyclic Groups</span>
                    <span className={`${styles.statValue} ${styles.statValueCycles}`}>
                      {apiResponse.summary.total_cycles}
                    </span>
                    <span className={styles.statDetail}>Loops detected</span>
                  </div>

                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Largest Root</span>
                    <span className={`${styles.statValue} ${styles.statValueLargest}`}>
                      {apiResponse.summary.largest_tree_root || "N/A"}
                    </span>
                    <span className={styles.statDetail}>Deepest hierarchy root</span>
                  </div>

                </section>

                {/* Main Visualizer / JSON Inspector Panel */}
                <div className={styles.tabs}>
                  <button 
                    className={`${styles.tab} ${activeTab === "visual" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("visual")}
                  >
                    Visual Component View
                  </button>
                  <button 
                    className={`${styles.tab} ${activeTab === "raw" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("raw")}
                  >
                    Raw API JSON Response
                  </button>
                </div>

                <div className={styles.tabContent}>
                  
                  {activeTab === "visual" && (
                    <div className={styles.hierarchiesList}>
                      {apiResponse.hierarchies.map((h, i) => {
                        const isCycle = h.has_cycle;
                        
                        return (
                          <div key={i} className={styles.hierarchyCard}>
                            
                            <div className={styles.hierarchyHeader}>
                              <div className={styles.hierarchyTitle}>
                                {isCycle ? (
                                  <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                                    Component {i + 1}: Cycle Root ({h.root})
                                  </>
                                ) : (
                                  <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                                    Component {i + 1}: Tree Root ({h.root})
                                  </>
                                )}
                              </div>
                              
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                {isCycle ? (
                                  <span className={`${styles.badge} ${styles.badgeCycle}`}>Cycle</span>
                                ) : (
                                  <>
                                    <span className={`${styles.badge} ${styles.badgeTree}`}>Tree</span>
                                    <span className={`${styles.badge} ${styles.badgeInfo}`}>Depth: {h.depth}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className={styles.treeContainer}>
                              {isCycle ? (
                                <p style={{ color: "#9ca3af", fontSize: "0.875rem", fontStyle: "italic", margin: "0" }}>
                                  This component forms a pure cycle or contains a loop. 
                                  Lexicographically smallest node <strong>{h.root}</strong> chosen as root. 
                                  No valid hierarchical tree structure is buildable (tree is empty).
                                </p>
                              ) : (
                                <div>
                                  {/* Re-render visual tree */}
                                  {(() => {
                                    const rootName = Object.keys(h.tree)[0];
                                    const childrenObj = h.tree[rootName] as Record<string, unknown>;
                                    return (
                                      <div className={styles.treeNodeItem}>
                                        <div className={`${styles.nodeCircle} ${styles.nodeCircleRoot}`}>{rootName}</div>
                                        {Object.keys(childrenObj).length > 0 && (
                                          <div className={styles.treeBranch}>
                                            {Object.keys(childrenObj).map(child => (
                                              <TreeNodeRender key={child} nodeName={child} childrenObj={childrenObj[child] as Record<string, unknown>} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}

                      {apiResponse.hierarchies.length === 0 && (
                        <p style={{ color: "#6b7280", fontStyle: "italic" }}>No hierarchies reconstructed.</p>
                      )}
                    </div>
                  )}

                  {activeTab === "raw" && (
                    <div>
                      <pre className={styles.jsonPre}>
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  )}

                </div>
              </>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}
