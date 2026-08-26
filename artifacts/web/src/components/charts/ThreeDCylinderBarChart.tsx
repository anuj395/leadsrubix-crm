import React from "react"
import { useTheme } from "@mui/material/styles"
import * as echarts from "echarts"
import { EChartWrapper } from "./EChartWrapper"
import type { EChartsOption } from "echarts"

interface BarItem {
  name: string
  value: number
  color?: string
}

interface ThreeDCylinderBarChartProps {
  data: BarItem[]
  title?: string
  height?: number | string
  colorTheme?: "emerald" | "indigo" | "purple" | "amber" | "sunset" | "multi"
}

export const ThreeDCylinderBarChart: React.FC<ThreeDCylinderBarChartProps> = ({
  data,
  height = 240,
  colorTheme = "sunset"
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === "dark"

  const themeGradients: Record<string, string[][]> = {
    emerald: [["#34D399", "#059669", "#047857"]],
    indigo: [["#818CF8", "#4F46E5", "#3730A3"]],
    purple: [["#C084FC", "#9333EA", "#7E22CE"]],
    amber: [["#FBBF24", "#D97706", "#B45309"]],
    sunset: [
      ["#FF7A00", "#EA580C", "#9A3412"], // Orange
      ["#F59E0B", "#D97706", "#78350F"], // Amber
      ["#EC4899", "#DB2777", "#831843"], // Pink
      ["#6366F1", "#4F46E5", "#312E81"], // Indigo
      ["#14B8A6", "#0D9488", "#115E59"]  // Teal
    ],
    multi: [
      ["#38BDF8", "#0284C7", "#0369A1"], // Sky
      ["#34D399", "#059669", "#047857"], // Emerald
      ["#FBBF24", "#D97706", "#B45309"], // Amber
      ["#A78BFA", "#7C3AED", "#5B21B6"]  // Purple
    ]
  }

  const activePalette = themeGradients[colorTheme] || themeGradients.sunset

  const effectiveData = data && data.length > 0 ? data : [
    { name: "Follow Up", value: 0 },
    { name: "Call Later", value: 0 },
    { name: "Busy", value: 0 },
    { name: "Price Issue", value: 0 },
    { name: "Location", value: 0 }
  ]

  const categories = effectiveData.map(d => d.name)
  const barData = effectiveData.map((d, index) => {
    const stops = activePalette[index % activePalette.length]
    return {
      name: d.name,
      value: d.value,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        shadowBlur: 10,
        shadowOffsetY: 4,
        shadowColor: "rgba(0, 0, 0, 0.2)",
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: stops[0] },
          { offset: 0.7, color: stops[1] },
          { offset: 1, color: stops[2] }
        ])
      }
    }
  })

  const options: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow"
      },
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      padding: [10, 14],
      textStyle: { color: isDark ? "#F8FAFC" : "#0F172A", fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); backdrop-filter: blur(8px); border-radius: 12px;",
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return (
          "<div style=\"font-weight: 700; margin-bottom: 2px;\">" + p.name + "</div>" +
          "<div style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px;\">" +
          "  <span style=\"color: " + (isDark ? "#94A3B8" : "#64748B") + ";\">Count:</span>" +
          "  <span style=\"font-weight: 700; color: #FF7A00;\">" + p.value + "</span>" +
          "</div>"
        )
      }
    },
    grid: {
      top: "15%",
      left: "3%",
      right: "4%",
      bottom: "8%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLine: {
        lineStyle: {
          color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
        }
      },
      axisLabel: {
        color: isDark ? "#94A3B8" : "#64748B",
        fontSize: 10.5,
        fontWeight: "bold",
        interval: 0
      }
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          type: "dashed",
          color: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"
        }
      },
      axisLabel: {
        color: isDark ? "#94A3B8" : "#64748B",
        fontSize: 11
      }
    },
    series: [
      {
        name: "Value",
        type: "bar",
        barWidth: 24,
        label: {
          show: true,
          position: "top",
          distance: 6,
          color: isDark ? "#F1F5F9" : "#1E293B",
          fontSize: 11,
          fontWeight: "bold"
        },
        data: barData
      }
    ]
  }

  return <EChartWrapper options={options} height={height} />
}
