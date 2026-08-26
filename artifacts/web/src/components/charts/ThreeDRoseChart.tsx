import React from "react"
import { useTheme } from "@mui/material/styles"
import * as echarts from "echarts"
import { EChartWrapper } from "./EChartWrapper"
import type { EChartsOption } from "echarts"

interface RoseItem {
  name: string
  value: number
  color?: string
}

interface ThreeDRoseChartProps {
  data: RoseItem[]
  title?: string
  height?: number | string
}

export const ThreeDRoseChart: React.FC<ThreeDRoseChartProps> = ({
  data,
  title,
  height = 280
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === "dark"

  const defaultColors = [
    ["#10B981", "#059669"], // Emerald
    ["#06B6D4", "#0891B2"], // Cyan
    ["#6366F1", "#4F46E5"], // Indigo
    ["#EC4899", "#DB2777"], // Pink
    ["#F59E0B", "#D97706"]  // Amber
  ]

  const effectiveData = data && data.length > 0 ? data : [
    { name: "Meeting", value: 0 },
    { name: "Call", value: 0 },
    { name: "Site Visit", value: 0 }
  ]

  const total = effectiveData.reduce((acc, curr) => acc + (curr.value || 0), 0)

  const seriesData = effectiveData.map((item, index) => {
    const pair = defaultColors[index % defaultColors.length]
    return {
      name: item.name,
      value: item.value,
      itemStyle: {
        borderRadius: 6,
        borderColor: isDark ? "#1E293B" : "#FFFFFF",
        borderWidth: 2,
        shadowBlur: 12,
        shadowOffsetY: 5,
        shadowColor: "rgba(0, 0, 0, 0.22)",
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: item.color || pair[0] },
          { offset: 1, color: item.color || pair[1] }
        ])
      }
    }
  })

  const options: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: isDark ? "#F8FAFC" : "#0F172A", fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); backdrop-filter: blur(8px); border-radius: 12px;",
      formatter: (params: any) => {
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0.0"
        return (
          "<div style=\"font-weight: 700; margin-bottom: 4px;\">" + params.name + "</div>" +
          "<div style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px;\">" +
          "  <span style=\"color: " + (isDark ? "#94A3B8" : "#64748B") + ";\">Completed:</span>" +
          "  <span style=\"font-weight: 700; color: #10B981;\">" + params.value + "</span>" +
          "</div>" +
          "<div style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px;\">" +
          "  <span style=\"color: " + (isDark ? "#94A3B8" : "#64748B") + ";\">Share:</span>" +
          "  <span style=\"font-weight: 600;\">" + percent + "%</span>" +
          "</div>"
        )
      }
    },
    legend: {
      bottom: "2%",
      left: "center",
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: {
        color: isDark ? "#CBD5E1" : "#475569",
        fontSize: 12,
        fontWeight: "bold"
      }
    },
    series: [
      {
        name: title || "Tasks",
        type: "pie",
        radius: ["25%", "72%"],
        center: ["50%", "45%"],
        roseType: "area",
        itemStyle: {
          borderRadius: 6
        },
        label: {
          show: false
        },
        data: seriesData
      }
    ]
  }

  return <EChartWrapper options={options} height={height} />
}
