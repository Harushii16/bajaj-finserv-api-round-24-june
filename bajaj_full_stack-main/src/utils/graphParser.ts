export interface Hierarchy {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
}

export interface ProcessingResult {
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

import { IDENTITY } from "../config/identity";

export function parseGraph(data: unknown): ProcessingResult {
  const invalid_entries: string[] = [];
  const duplicate_edges: string[] = [];
  
  // 1. Validate and clean input
  if (!data || !Array.isArray(data)) {
    return {
      ...IDENTITY,
      hierarchies: [],
      invalid_entries: [],
      duplicate_edges: [],
      summary: { total_trees: 0, total_cycles: 0, largest_tree_root: "" }
    };
  }

  const validEdges: { raw: string; parent: string; child: string }[] = [];
  const seenPairs = new Set<string>();
  const duplicateSet = new Set<string>();

  (data as unknown[]).forEach((entry: unknown) => {
    if (typeof entry !== "string") {
      invalid_entries.push(String(entry));
      return;
    }

    const trimmed = entry.trim();
    
    // Validate format X->Y where X and Y are uppercase letters A-Z
    const match = trimmed.match(/^([A-Z])->([A-Z])$/);
    if (!match) {
      invalid_entries.push(entry); // Push original untrimmed entry to invalid_entries
      return;
    }

    const parent = match[1];
    const child = match[2];

    // Self-loops are treated as invalid
    if (parent === child) {
      invalid_entries.push(entry);
      return;
    }

    const pairKey = `${parent}->${child}`;
    if (seenPairs.has(pairKey)) {
      if (!duplicateSet.has(pairKey)) {
        duplicateSet.add(pairKey);
        duplicate_edges.push(pairKey);
      }
    } else {
      seenPairs.add(pairKey);
      validEdges.push({ raw: trimmed, parent, child });
    }
  });

  // 2. Resolve Multi-parent / Diamond case (First-encountered parent edge wins)
  const parentOf = new Map<string, string>();
  const childMap = new Map<string, Set<string>>();
  const constructedEdges: { parent: string; child: string; index: number }[] = [];
  const allNodes = new Set<string>();

  // Add all nodes from all valid edges to ensure isolated nodes are tracked
  validEdges.forEach(edge => {
    allNodes.add(edge.parent);
    allNodes.add(edge.child);
  });

  validEdges.forEach((edge, idx) => {
    const { parent, child } = edge;
    
    if (parentOf.has(child)) {
      // Node already has a parent, silently discard subsequent parent edges
      return;
    }

    parentOf.set(child, parent);
    if (!childMap.has(parent)) {
      childMap.set(parent, new Set<string>());
    }
    childMap.get(parent)!.add(child);
    
    constructedEdges.push({ parent, child, index: idx });
  });

  // 3. Find connected components (undirected) from constructed edges
  const adj = new Map<string, string[]>();
  allNodes.forEach(node => adj.set(node, []));

  constructedEdges.forEach(({ parent, child }) => {
    adj.get(parent)!.push(child);
    adj.get(child)!.push(parent);
  });

  const visited = new Set<string>();
  const components: string[][] = [];

  allNodes.forEach(node => {
    if (!visited.has(node)) {
      const comp: string[] = [];
      const queue = [node];
      visited.add(node);
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(comp);
    }
  });

  // Helper to build nested tree object
  const buildTreeObj = (node: string): Record<string, unknown> => {
    const childrenSet = childMap.get(node);
    if (!childrenSet || childrenSet.size === 0) {
      return {};
    }
    const sortedChildren = Array.from(childrenSet).sort();
    const result: Record<string, unknown> = {};
    sortedChildren.forEach(child => {
      result[child] = buildTreeObj(child);
    });
    return result;
  };

  // Helper to calculate depth
  const getDepth = (node: string): number => {
    const childrenSet = childMap.get(node);
    if (!childrenSet || childrenSet.size === 0) {
      return 1;
    }
    let maxChildDepth = 0;
    childrenSet.forEach(child => {
      maxChildDepth = Math.max(maxChildDepth, getDepth(child));
    });
    return 1 + maxChildDepth;
  };

  // 4. Process each component into Hierarchy objects
  const hierarchies: { hierarchy: Hierarchy; firstEdgeIndex: number }[] = [];

  components.forEach(comp => {
    // Find if there is a root (in-degree 0, i.e., has no parent in parentOf)
    const rootsInComp = comp.filter(node => !parentOf.has(node));

    // Determine the earliest appearance of this component in the original input data
    // to preserve original order
    let firstEdgeIndex = Infinity;
    comp.forEach(node => {
      // Find the index of the first valid edge containing this node
      const nodeIdx = validEdges.findIndex(e => e.parent === node || e.child === node);
      if (nodeIdx !== -1 && nodeIdx < firstEdgeIndex) {
        firstEdgeIndex = nodeIdx;
      }
    });

    if (rootsInComp.length === 1) {
      // Valid Tree
      const root = rootsInComp[0];
      const treeObj = { [root]: buildTreeObj(root) };
      const depth = getDepth(root);

      hierarchies.push({
        hierarchy: {
          root,
          tree: treeObj,
          depth
        },
        firstEdgeIndex
      });
    } else {
      // Cycle Component (0 roots because every node has exactly 1 parent in parent-child relationship)
      // Sort components lexicographically to find the smallest node as root
      const sortedComp = [...comp].sort();
      const root = sortedComp[0];

      hierarchies.push({
        hierarchy: {
          root,
          tree: {},
          has_cycle: true
        },
        firstEdgeIndex
      });
    }
  });

  // Sort hierarchies by the order of their component's first appearance in the input
  hierarchies.sort((a, b) => a.firstEdgeIndex - b.firstEdgeIndex);

  const finalHierarchies = hierarchies.map(h => h.hierarchy);

  // 5. Compute summary statistics
  let total_trees = 0;
  let total_cycles = 0;
  let maxDepth = -1;
  let largest_tree_root = "";

  finalHierarchies.forEach(h => {
    if (h.has_cycle) {
      total_cycles++;
    } else {
      total_trees++;
      const d = h.depth || 0;
      if (d > maxDepth) {
        maxDepth = d;
        largest_tree_root = h.root;
      } else if (d === maxDepth) {
        // Tiebreaker: lexicographically smaller root wins
        if (h.root < largest_tree_root) {
          largest_tree_root = h.root;
        }
      }
    }
  });

  return {
    ...IDENTITY,
    hierarchies: finalHierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root
    }
  };
}
