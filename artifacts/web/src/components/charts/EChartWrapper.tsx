import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

interface EChartWrapperProps {
  options: echarts.EChartsOption
  height?: number | string
  width?: number | string
  sx?: any
  onEvents?: Record<string, (params: any) => void>
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({
  options,
  height = 300,
  width = '100%',
  sx,
  onEvents
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current, theme.palette.mode === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas'
    })

    if (onEvents && chartInstance.current) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chartInstance.current?.on(eventName, handler)
      })
    }

    chartInstance.current.setOption(options, true)

    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current || !chartInstance.current) return
    chartInstance.current.setOption(options, true)
  }, [options])

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize()
    })
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [])

  return <Box ref={chartRef} sx={{ width, height, ...sx }} />
}
