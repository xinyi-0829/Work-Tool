'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScheduleData {
  Project: string;
  Stage: string;
  Title: string;
}

export default function Home() {
  const [data, setData] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/schedule');
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error('Invalid data format received');
      }
      
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('获取数据时出错，请稍后重试');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const headers = ['Project', 'Stage', 'Title'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.Project}"`,
        `"${row.Stage}"`,
        `"${row.Title}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-start gap-4 mb-8">
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            导出 CSV
          </button>
          <Link href="/fee" className="text-blue-600 hover:text-blue-800">
            查看费用计算
          </Link>
        </div>
        {data.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  <th className="px-6 py-3 border-b text-left">项目</th>
                  <th className="px-6 py-3 border-b text-left">阶段</th>
                  <th className="px-6 py-3 border-b text-left">标题</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-b">{row.Project}</td>
                    <td className="px-6 py-4 border-b">{row.Stage}</td>
                    <td className="px-6 py-4 border-b">{row.Title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
} 