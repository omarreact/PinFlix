import { describe, expect, it } from "vitest";
import { extractSearchItems, validSearchSubject } from "./search-response";
const show={ subjectId: "123", title: "Loki", subjectType: 2, detailPath: "loki-x" };
describe("provider search response shapes",()=>{
  it("reads nested and plain search collections",()=>{
    expect(extractSearchItems({items:[show]})).toEqual([show]);
    expect(extractSearchItems({data:{subjects:[show]}})).toEqual([show]);
    expect(extractSearchItems({data:{result:{list:[show]}}})).toEqual([show]);
    expect(extractSearchItems({items:[]})).toEqual([]);
  });
  it("distinguishes schema errors from empty matches",()=>{
    expect(extractSearchItems({message:"Blocked"})).toBeNull();
    expect(extractSearchItems(null)).toBeNull();
    expect(extractSearchItems({data:{error:"Denied"}})).toBeNull();
  });
  it("accepts only genuine movie and TV provider records",()=>{
    expect(validSearchSubject(show)).toBe(true);
    expect(validSearchSubject({subject:show})).toBe(true);
    expect(validSearchSubject({...show,subjectType:7})).toBe(false);
    expect(validSearchSubject({...show,subjectId:"not-an-id"})).toBe(false);
    expect(validSearchSubject({...show,title:""})).toBe(false);
  });
});
