import { NextResponse } from 'next/server';
import { addMonths, format, startOfMonth, endOfMonth, addDays } from 'date-fns';

interface ApiData {
  project: string;
  stage: string;
  subjects: string[] | string;
  day: string;
  start_time: string;
  end_time: string;
}

interface ApiResponse {
  data: ApiData[];
  meta: {
    count: number;
    page: number;
    pageSize: number;
    totalPage: number;
  };
}

function convertTo12Hour(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minutes === '00' ? '' : ':' + minutes}${ampm}`;
}

function formatSubjects(subjects: string[] | string): string {
  if (!subjects) return '';
  if (Array.isArray(subjects)) {
    return subjects.join(' & ');
  }
  return String(subjects);
}

async function fetchAllData(apiUrl: string, apiToken: string): Promise<ApiData[]> {
  let allData: ApiData[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await fetch(`${apiUrl}?filter={}&page=${currentPage}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from external API');
    }

    const result = await response.json() as ApiResponse;
    allData = [...allData, ...result.data];
    totalPages = result.meta.totalPage;
    currentPage++;
  } while (currentPage <= totalPages);

  return allData;
}

export async function GET() {
  try {
    const apiUrl = process.env.API_URL || 'https://tuition-work.onrender.com/api/data:list';
    const apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRlbXAiOnRydWUsInNpZ25JblRpbWUiOjE3NDgwNjczNzczOTksImlhdCI6MTc0ODE1NDA1OCwiZXhwIjoxNzQ4MjQwNDU4LCJqdGkiOiJjOTEwZjliMC01ZmFjLTQ1MGYtOWFlOS04NjdjNjk3ZDU0YjIifQ.VwtBrYRFUEByL0BehvHDViW8d2ygVkOOEX50r2m9p8o';

    if (!apiToken) {
      throw new Error('API token is not configured');
    }

    const allData = await fetchAllData(apiUrl, apiToken);
    
    if (!allData || !Array.isArray(allData)) {
      return NextResponse.json([], { status: 200 });
    }
    
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    const startDate = startOfMonth(nextMonth);
    const endDate = endOfMonth(nextMonth);
    
    const scheduleData = [];
    
    for (const row of allData) {
      const { project, stage, subjects, day, start_time, end_time } = row;
      
      let currentDate = startDate;
      while (currentDate <= endDate) {
        const dayName = format(currentDate, 'EEEE');
        if (dayName === day) {
          const formattedStartTime = convertTo12Hour(start_time);
          const formattedEndTime = convertTo12Hour(end_time);
          const formattedSubjects = formatSubjects(subjects);
          scheduleData.push({
            Project: project,
            Stage: stage,
            Title: `${format(currentDate, 'dd/MM/yyyy')} ${formattedStartTime}-${formattedEndTime} ${formattedSubjects}`
          });
        }
        currentDate = addDays(currentDate, 1);
      }
    }
    
    // 按Project和Title中的日期倒序排序
    scheduleData.sort((a, b) => {
      // 首先按Project排序
      const projectComparison = a.Project.localeCompare(b.Project);
      if (projectComparison !== 0) {
        return projectComparison;
      }
      
      // 如果Project相同，则按Title中的日期倒序
      return b.Title.localeCompare(a.Title);
    });
    
    return NextResponse.json(scheduleData || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json([], { status: 500 });
  }
} 