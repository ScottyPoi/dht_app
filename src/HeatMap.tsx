import * as d3 from "d3";
import { ITreeNode } from "./types";
import { useContext } from "react";
import { ActionTypes, BinaryTreeContext } from "./BinaryTreeProvider";

interface HeatMapProps {
  nodes: d3.HierarchyNode<ITreeNode>[];
}

const calculateDistance = (first: string, second: string) => {
  // console.log("distance", { first, second });
  if (first.length < 3 || second.length < 3) {
    return "0x00";
  }
  if (first.length !== second.length) {
    return "0x00";
    // throw new Error(
    //   `Input should be binary strings of equal lengths.  Got: \n${first} (${first.length}) and \n${second} (${second.length})`
    // );
  }
  if (!first.startsWith("0b") || !second.startsWith("0b")) {
    // throw new Error(
    //   `Input should be binary strings of equal lengths.  Got: \n${first} and \n${second}`
    // );
    return "0x00";
  }
  const f = BigInt(parseInt(first.slice(2), 2));
  const s = BigInt(parseInt(second.slice(2), 2));
  const d = f ^ s;
  return "0x" + d.toString(16).padStart(first.length - 2, "0");
};

const fillColorById = (id: string) => {
  return id.endsWith("0") ? "green" : "blue";
};

const fillColorByDistance = (
  colorScale: d3.ScaleSequential<string, never>,
  distance?: string
) => {
  return distance ? colorScale(parseInt(distance.slice(2), 16)) : "none";
};

interface ILeafHeatProps {
  nodeData: ITreeNode;
  distance: string;
  startAngle: number;
  endAngle: number;
  colorScale: d3.ScaleSequential<string, never>;
  dimensions: ILeafHeatDimensions;
}

interface ILeafHeatDimensions {
  heat_innerRadius: number;
  node_innerRadius: number;
  heat_outerRadius: number;
  node_outerRadius: number;
}
function LeafHeat({
  nodeData,
  startAngle,
  endAngle,
  colorScale,
  distance,
  dimensions: {
    heat_innerRadius,
    node_innerRadius,
    heat_outerRadius,
    node_outerRadius,
  },
}: ILeafHeatProps) {
  const { state, dispatch } = useContext(BinaryTreeContext);
  const inRadius = BigInt(distance) <= BigInt(2 ** state.radius - 1);
  // Only for leaf nodes
  const handleMouseOver = () => {
    dispatch({
      type: ActionTypes.SetTooltip,
      payload: { id: nodeData.id, x: nodeData.x, y: nodeData.y },
    });
  };
  const handleMouseOut = () => {
    dispatch({ type: ActionTypes.SetTooltip, payload: null });
  };

  const arcGenerator = d3.arc();
  const hovered = state.tooltip?.id === nodeData.id;
  const fontSize = hovered
    ? "7rem"
    : state.depth < 4
    ? "7rem"
    : `${8 / ((state.depth - 3) * 2)}rem`;

  return (
    <>
      <path
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        d={
          arcGenerator({
            innerRadius: heat_innerRadius,
            outerRadius: heat_outerRadius,
            startAngle,
            endAngle,
          }) ?? undefined
        }
        fill={fillColorByDistance(colorScale, distance)}
        opacity={0.75}
        transform={`translate(${state.center.x},${state.center.y})`}
      />
      <path
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        d={
          arcGenerator({
            innerRadius: node_innerRadius,
            outerRadius: node_outerRadius,
            startAngle,
            endAngle,
          }) ?? undefined
        }
        fill={fillColorById(nodeData.id)}
        opacity={1}
        transform={`translate(${state.center.x},${state.center.y})`}
      />

      <path
        onMouseOver={() => handleMouseOver}
        onMouseOut={() => handleMouseOut}
        d={
          arcGenerator({
            innerRadius: node_outerRadius,
            outerRadius: heat_outerRadius + 16,
            startAngle,
            endAngle,
          }) ?? undefined
        }
        fill={inRadius ? "yellow" : "none"}
        opacity={1}
        transform={`translate(${state.center.x},${state.center.y})`}
      />
      <path
        id={`${nodeData.id}Arc`}
        d={
          arcGenerator({
            innerRadius: node_outerRadius,
            outerRadius: heat_outerRadius + 16,
            startAngle,
            endAngle:
              state.tooltip?.id === nodeData.id ? endAngle + Math.PI : endAngle,
          }) ?? undefined
        }
        fill={"none"}
        opacity={1}
        transform={`translate(${state.center.x},${state.center.y})`}
      />
      <text overflow={"hidden"}>
        <textPath
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          lengthAdjust={"spacing"}
          fontSize={fontSize}
          href={`#${nodeData.id}Arc`}
          opacity={1}
        >
          {hovered
            ? BigInt(distance).toString()
            : `|_${BigInt(distance).toString().length === 1 ? "_" : ""}${BigInt(
                distance
              ).toString()}${
                BigInt(distance).toString().length < 3 ? "_" : ""
              }_`}
        </textPath>
      </text>
    </>
  );
}

const getLeafAngles = (
  node: d3.HierarchyNode<ITreeNode>,
  center: { x: number; y: number }
): [string, {
  leftParent: d3.HierarchyNode<any>,
  rightParent: d3.HierarchyNode<any>,
  nodeAngle: number,
  leftParentAngle: number,
  rightParentAngle: number
}] => {
  const nodePos = node.data.id[node.data.id.length - 1];
  let oppParent = node.parent ?? node;
  while (oppParent.parent && oppParent.data.id.endsWith(nodePos)) {
    oppParent = oppParent.parent;
  }
  let sameParent = node.parent ?? node;
  while (sameParent.parent && !sameParent.data.id.endsWith(nodePos)) {
    sameParent = sameParent.parent;
  }
  const leftParent =
    nodePos === "1" ? node.parent! : oppParent!.parent ?? oppParent;
  const rightParent =
    nodePos === "0" ? node.parent! : oppParent.parent ?? oppParent;

  const leftParentPosition = {
    x: leftParent.data.x,
    y: leftParent.data.y,
  };
  const rightParentPosition = {
    x: rightParent.data.x,
    y: rightParent.data.y,
  };
  const nodeAngle =
    Math.PI / 2 + Math.atan2(node.data.y - center.y, node.data.x - center.x);
  let leftParentAngle =
    Math.PI / 2 +
    Math.atan2(
      leftParentPosition.y - center.y,
      leftParentPosition.x - center.x
    );
  let rightParentAngle =
    Math.PI / 2 +
    Math.atan2(
      rightParentPosition.y - center.y,
      rightParentPosition.x - center.x
    );
  leftParentAngle =
    leftParentAngle === Math.PI / 2
      ? Math.round(rightParentAngle) === 2
        ? Math.PI / 2
        : Math.round(rightParentAngle) === 0
        ? 0
        : Math.round(rightParentAngle) === -2
        ? -2 * Math.PI +
          nodeAngle -
          (rightParentAngle - (-2 * Math.PI + nodeAngle))
        : nodeAngle - (rightParentAngle - nodeAngle)
      : leftParentAngle;

  rightParentAngle =
    rightParentAngle === Math.PI / 2
      ? Math.round(leftParentAngle) === 2
        ? nodeAngle + (nodeAngle - leftParentAngle)
        : Math.round(leftParentAngle) === 0
        ? 0
        : Math.round(leftParentAngle) === -2
        ? -Math.PI / 2
        : Math.PI
      : rightParentAngle;

  if (leftParentAngle > rightParentAngle) {
    leftParentAngle -= Math.PI * 2;
  }
  if (rightParentAngle === Math.PI) {
    rightParentAngle = nodeAngle + (nodeAngle - leftParentAngle);
  }

  return [
    node.data.id,
    {
      leftParent,
      rightParent,
      nodeAngle,
      leftParentAngle,
      rightParentAngle,
    },
  ];
};


export default function HeatMap({ nodes }: HeatMapProps) {
  const { state } = useContext(BinaryTreeContext);
  
  const minDistance = 0;
  const maxDistance = 2 ** (state.depth - 1) - 1;
  const arcWidth = 20;
  const nodeWidth = 16;

  const leafNodes = nodes.slice(
    2 ** (state.depth - 1) - 1,
    2 ** state.depth - 1
  );
  const leafAngles = Object.fromEntries(
    leafNodes.map((node) => {
      return getLeafAngles(node, { x: state.center.x, y: state.center.y });
    })
  );
  
  const leafPosition = {
    x: nodes[nodes.length - 1].data.x,
    y: nodes[nodes.length - 1].data.y,
  };
  const leafDistance = Math.sqrt(
    (state.center.x - leafPosition.x) ** 2 +
      (state.center.y - leafPosition.y) ** 2
  );
  const colorScale = d3
    .scaleSequential(d3.interpolateReds)
    .domain([minDistance, maxDistance]);

  const dimensions = {
    heat_innerRadius: 16,
    node_innerRadius: leafDistance - nodeWidth,
    heat_outerRadius: leafDistance + 16 + arcWidth,
    node_outerRadius: leafDistance + nodeWidth,
  };
  return nodes.length > 3 ? (
    <>
      {nodes.slice().map((node) => {
        const nodeData = node.data;
        if (node.depth === state.depth - 1) {
          // Only for leaf nodes
          const distance = calculateDistance(state.selected, nodeData.id);
          const startAngle = leafAngles[nodeData.id].leftParentAngle;
          const endAngle = leafAngles[nodeData.id].rightParentAngle;

          return (
            <LeafHeat
              nodeData={nodeData}
              distance={distance}
              colorScale={colorScale}
              startAngle={startAngle}
              endAngle={endAngle}
              dimensions={dimensions}
              key={node.data.id}
            />
          );
        } else if (node.depth > 0) {
          // radial angle relative to center node
          const nodeAngle = Math.atan2(
            node.data.y - state.center.y,
            node.data.x - state.center.x
          );
          // point at leaf distance at nodeAngle
          const nodeCoordinate = {
            x:
              state.center.x +
              (leafDistance + arcWidth + 16) * Math.cos(nodeAngle),
            y:
              state.center.y +
              (leafDistance + arcWidth + 16) * Math.sin(nodeAngle),
          };

          return (
            <>
              <line
                x1={node.data.x}
                y1={node.data.y}
                x2={nodeCoordinate.x}
                y2={nodeCoordinate.y}
                stroke="black"
              />
            </>
          );
        }
        return <> </>;
      })}
    </>
  ) : nodes.length === 3 ? (
    // Special case for 2 leaf nodes
    <>
      <LeafHeat
        nodeData={nodes[1].data}
        startAngle={-Math.PI / 2}
        endAngle={0}
        distance={state.selected === nodes[1].data.id ? "0x00" : "0x01"}
        colorScale={colorScale}
        dimensions={dimensions}
      />
      <LeafHeat
        nodeData={nodes[2].data}
        startAngle={0}
        endAngle={Math.PI / 2}
        distance={state.selected === nodes[2].data.id ? "0x00" : "0x01"}
        colorScale={colorScale}
        dimensions={dimensions}
      />
    </>
  ) : (
    <></>
  );
}
