import React from "react"
import { useTheme } from "@mui/material/styles"
import * as echarts from "echarts"
import { EChartWrapper } from "./EChartWrapper"
import type { EChartsOption } from "echarts"

interface TrendItem {
  date: string
  calls?: number
  value?: number
}

interface ThreeDAreaTrendChartProps {
  data: TrendItem[]
  title?: string
  height?: number | string
}

export const ThreeDAreaTrendChart: React.FC<ThreeDAreaTrendChartProps> = ({
  data,
  height = 240
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === "dark"

  const effectiveData = data && data.length > 0 ? data : [
    { date: "Mon", calls: 0 },
    { date: "Tue", calls: 0 },
    { date: "Wed", calls: 0 },
    { date: "Thu", calls: 0 },
    { date: "Fri", calls: 0 },
    { date: "Sat", calls: 0 },
    { date: "Sun", calls: 0 }
  ]

  const categories = effectiveData.map((d: any) => d.date || d.name || d.label || "Today")
  const values = effectiveData.map((d: any) => (d.calls !== undefined ? d.calls : (d.value !== undefined ? d.value : 0)))

  const options: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "#38BDF8",
          width: 2,
          type: "dashed"
        }
      },
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      padding: [10, 14],
      textStyle: { color: isDark ? "#F8FAFC" : "#0F172A", fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); backdrop-filter: blur(8px); border-radius: 12px;",
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return (
          '<div style="font-weight: 700; margin-bottom: 2px;">' + p.name + '</div>' +
          '<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">' +
          '  <span style="color: ' + (isDark ? '#94A3B8' : '#64748B') + ';">Calls Logged:</span>' +
          '  <span style="font-weight: 700; color: #0284C7;">' + p.value + '</span>' +
          '</div>'
        )
      }
    },
    grid: {
      top: "12%",
      left: "3%",
      right: "4%",
      bottom: "8%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: categories,
      axisLine: {
        lineStyle: {
          color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
        }
      },
      axisLabel: {
        color: isDark ? "#94A3B8" : "#64748B",
        fontSize: 11,
        fontWeight: "bold"
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
        name: "Calling Activity",
        type: "line",
        smooth: 0.45,
        symbol: "circle",
        symbolSize: 7,
        itemStyle: {
          color: "#0284C7",
          borderColor: "#FFFFFF",
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: "rgba(2, 132, 199, 0.45)"
        },
        lineStyle: {
          width: 3.5,
          color: "#0284C7",
          shadowColor: "rgba(2, 132, 199, 0.35)",
          shadowBlur: 10,
          shadowOffsetY: 6
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(2, 132, 199, 0.45)" },
            { offset: 0.7, color: "rgba(2, 132, 199, 0.12)" },
            { offset: 1, color: "rgba(2, 132, 199, 0.00)" }
          ])
        },
        data: values
      }
    ]
  }

  return <EChartWrapper options={options} height={height} />
}
