import React from "react"
import { useTheme } from "@mui/material/styles"
import * as echarts from "echarts"
import { EChartWrapper } from "./EChartWrapper"
import type { EChartsOption } from "echarts"

interface DonutItem {
  name: string
  value: number
  color?: string
}

interface ThreeDDonutChartProps {
  data: DonutItem[]
  title?: string
  height?: number | string
  centerText?: string
  centerLabel?: string
  colorPalette?: "conversion" | "tasks" | "pending" | "callback" | "rainbow"
}

export const ThreeDDonutChart: React.FC<ThreeDDonutChartProps> = ({
  data,
  height = 280,
  centerText,
  centerLabel = "TOTAL",
  colorPalette = "conversion"
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === "dark"

  const palettes: Record<string, string[][]> = {
    conversion: [
      ["#10B981", "#059669"], // Emerald (Won)
      ["#3B82F6", "#1D4ED8"], // Blue (Interested)
      ["#F43F5E", "#BE123C"], // Rose (Not Interested)
      ["#8B5CF6", "#6D28D9"], // Purple
      ["#F59E0B", "#B45309"]  // Amber
    ],
    tasks: [
      ["#06B6D4", "#0891B2"], // Cyan (Meeting)
      ["#10B981", "#047857"], // Emerald (Call)
      ["#6366F1", "#4338CA"], // Indigo (Site Visit)
      ["#EC4899", "#BE185D"]  // Pink
    ],
    pending: [
      ["#F59E0B", "#D97706"], // Amber
      ["#EF4444", "#B91C1C"], // Red
      ["#FB923C", "#EA580C"], // Orange
      ["#A855F7", "#7E22CE"]  // Purple
    ],
    callback: [
      ["#FF7A00", "#C2410C"], // Vibrant Orange
      ["#EAB308", "#A16207"], // Gold
      ["#0EA5E9", "#0369A1"], // Sky Blue
      ["#D946EF", "#A21CAF"], // Fuchsia
      ["#14B8A6", "#0F766E"]  // Teal
    ],
    rainbow: [
      ["#10B981", "#059669"],
      ["#3B82F6", "#2563EB"],
      ["#8B5CF6", "#7C3AED"],
      ["#F59E0B", "#D97706"],
      ["#EC4899", "#DB2777"],
      ["#06B6D4", "#0891B2"]
    ]
  }

  const activePalette = palettes[colorPalette] || palettes.conversion

  const effectiveData = data && data.length > 0 ? data : [
    { name: "Interested", value: 0 },
    { name: "Won", value: 0 },
    { name: "Not Interested", value: 0 }
  ]

  const total = effectiveData.reduce((acc, curr) => acc + (curr.value || 0), 0)

  const seriesData = effectiveData.map((item, index) => {
    const pair = activePalette[index % activePalette.length]
    return {
      name: item.name,
      value: item.value,
      itemStyle: {
        borderRadius: 8,
        borderColor: isDark ? "#1E293B" : "#FFFFFF",
        borderWidth: 2,
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        shadowColor: "rgba(0, 0, 0, 0.25)",
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: item.color || pair[0] },
          { offset: 1, color: item.color || pair[1] }
        ])
      }
    }
  })

  const options: EChartsOption = {
    backgroundColor: "transparent",
    title: {
      text: centerText || (total > 0 ? String(total) : "0"),
      subtext: centerLabel,
      left: "center",
      top: "33%",
      textStyle: {
        fontSize: 24,
        fontWeight: "bold",
        color: isDark ? "#F8FAFC" : "#0F172A",
        fontFamily: "Inter, sans-serif"
      },
      subtextStyle: {
        fontSize: 9.5,
        fontWeight: "bold",
        color: isDark ? "#94A3B8" : "#64748B",
        fontFamily: "Inter, sans-serif",
        padding: [2, 0, 0, 0]
      }
    },
    tooltip: {
      trigger: "item",
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: isDark ? "#F8FAFC" : "#0F172A",
        fontSize: 12
      },
      extraCssText: "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); backdrop-filter: blur(8px); border-radius: 12px;",
      formatter: (params: any) => {
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0.0"
        return (
          "<div style=\"font-weight: 700; margin-bottom: 4px;\">" + params.name + "</div>" +
          "<div style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px;\">" +
          "  <span style=\"color: " + (isDark ? "#94A3B8" : "#64748B") + ";\">Count:</span>" +
          "  <span style=\"font-weight: 700;\">" + params.value + "</span>" +
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
        fontSize: 11.5,
        fontWeight: "bold"
      }
    },
    series: [
      {
        name: "Distribution",
        type: "pie",
        radius: ["58%", "78%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: false,
        padAngle: 3,
        itemStyle: {
          borderRadius: 8
        },
        label: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: {
            show: false
          }
        },
        data: seriesData
      }
    ]
  }

  return <EChartWrapper options={options} height={height} />
}
