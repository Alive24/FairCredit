"use client";

import type { Address } from "@solana/kit";
import {
  fetchMaybeCourse,
  type Course,
} from "@/lib/solana/generated/accounts/course";
import {
  fetchMaybeCourseList,
  type CourseList,
} from "@/lib/solana/generated/accounts/courseList";

export type ResolvedCourse = {
  address: Address;
  course: Course;
};

type Rpc = Parameters<typeof fetchMaybeCourse>[0];

export async function resolveAcceptedCourses(
  rpc: Rpc,
  references: readonly Address[] | null | undefined
): Promise<ResolvedCourse[]> {
  if (!references?.length) return [];
  const resolved: ResolvedCourse[] = [];
  const visited = new Set<string>();

  for (const reference of references) {
    const course = await fetchMaybeCourse(rpc, reference);
    if (course) {
      pushUniqueCourse(course, resolved, visited);
      continue;
    }

    const listAccount = await fetchMaybeCourseList(rpc, reference);
    if (!listAccount) {
      console.warn(
        "[resolveAcceptedCourses] reference is neither course nor course list",
        reference.toString()
      );
      continue;
    }

    for (const courseAddress of listAccount.data.courses) {
      const maybeCourse = await fetchMaybeCourse(rpc, courseAddress as Address);
      if (maybeCourse) {
        pushUniqueCourse(maybeCourse, resolved, visited);
      } else {
        console.warn(
          "[resolveAcceptedCourses] missing course in course list",
          courseAddress.toString()
        );
      }
    }
  }

  return resolved;
}

export async function resolveCourseLists(
  rpc: Rpc,
  references: readonly Address[] | null | undefined
): Promise<CourseList[]> {
  if (!references?.length) return [];
  const lists: CourseList[] = [];
  for (const reference of references) {
    const listAccount = await fetchMaybeCourseList(rpc, reference);
    if (listAccount) {
      lists.push(listAccount.data);
    }
  }
  return lists;
}

function pushUniqueCourse(
  account: Awaited<ReturnType<typeof fetchMaybeCourse>>,
  bucket: ResolvedCourse[],
  visited: Set<string>
) {
  if (!account) return;
  const key = account.address.toString();
  if (visited.has(key)) return;
  visited.add(key);
  bucket.push({ address: account.address, course: account.data });
}
