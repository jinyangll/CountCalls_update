import React, { useState, useRef } from "react";
import Board from "./component/Board";
import "./App.css";
import * as XLSX from "xlsx";
import {saveAs} from "file-saver";

function App() {
  const [inputValue, setInputValue] = useState("");

  // 수정 부분 - 이릅 입력받기
  const [nameValue, setNameValue] = useState("");


  const [allNumber, setAllNumber] = useState([]);
  const nextId = useRef(1);
  const [result, setResult] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const addNum = () => {
    const cleaned = inputValue.trim().replace(/\s+/g, "");
    if (cleaned === "") {
      setErrorMessage("전화번호를 입력해주세요.");
      return;
    }
    setErrorMessage("");

    if (allNumber.some(item => item.text === cleaned)) {
      setErrorMessage("이미 추가된 전화번호입니다.");
      return;
    }

    const newItem = { id: nextId.current, text: cleaned, name: nameValue};
    setAllNumber([...allNumber, newItem]);
    nextId.current += 1;
    setInputValue("");
    setNameValue("");
  };

  const deleteItem = (id) => {
    setAllNumber(allNumber.filter((item) => item.id !== id));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".xlsx")) {
      setSelectedFile(file);
      setErrorMessage("");
      console.log("파일이 선택되었습니다:", file.name, file);
    } else {
      setSelectedFile(null);
      setErrorMessage("유효한 .xlsx 엑셀 파일을 선택해주세요.");
      console.log("유효하지 않은 파일이 선택되었습니다.");
    }
  };


  const sendToServer = () => {
    console.log("sendToServer 호출됨");
    console.log("현재 selectedFile 상태:", selectedFile);
    console.log("현재 allNumber 상태:", allNumber.map((item) => item.text));

    if (!selectedFile) {
      setErrorMessage("엑셀 파일을 먼저 선택해주세요.");
      return;
    }
    if (allNumber.length === 0) {
      setErrorMessage("분석할 전화번호를 최소 하나 이상 추가해주세요.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    setResult([]);
    

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("numbers", JSON.stringify(allNumber.map(
      item => ({number: item.text, name: item.name}))));

    for (let pair of formData.entries()) {
      console.log(pair[0]+ ', ' + pair[1]);
    }



    fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        setIsLoading(false);
        if (!res.ok) {
          return res.json().then(errorData => {
            throw new Error(errorData.error || "서버 오류가 발생했습니다.");
          });
        }
        return res.json();
      })
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        console.error("서버 요청 중 오류발생: ", err);
        setErrorMessage(`요청 실패: ${err.message || "알 수 없는 오류"}`);
      });
  };


const exportToExcel = () => {
  if (result.length === 0) return;

  const exportData = result.map((row) => {
    const newRow = {
      phone_number: row.phone_number,
    };

    specialNumbers.forEach((special) => {
      newRow[`${special}_착신`] = row[`${special}_착신`] ?? 0;
      newRow[`${special}_발신`] = row[`${special}_발신`] ?? 0;
      newRow[`${special}_총`] = row[`${special}_총`] ?? 0;
    });

    newRow["total"] = row.total ?? 0;

    return newRow;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "분석결과");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(fileData, "착신발신_분석결과.xlsx");
};


  const specialNumbers = result.length
    ? Object.keys(result[0])
        .filter(
          (key) =>
            key !== "phone_number" &&
            key !== "total" && 
            (key.endsWith("_착신") || key.endsWith("_발신") || key.endsWith("_총"))
        )
        .map((key) => key.split("_")[0])
        .filter((v, i, self) => self.indexOf(v) === i) // 중복 제거
    : [];

  return (
    <div className="box">
      <div className="titleBox">
        <div className="titleCountCall">Count Calls</div>
      </div>
      <br />
      <div>

        <details className="howToUse">
        <summary>사용방법</summary>
        <br/>
        1. 전화번호는 010과 -를 제외한 8자리를 입력하세요.<br />
        &nbsp;&nbsp;&nbsp;&nbsp;번호 사이의 띄어쓰기 여부는 상관없습니다.<br/><br/>
        ex) <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 010-1111-2222 (x) <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  1111 2222 (o)<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  11112222 (o)
        <br/><br/>

        2. 이름/별칭 입력은 선택사항입니다.<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;입력할 경우 전화번호 옆에 이름이 함께 표시됩니다.<br/><br/>
        
        3. 엑셀 파일 형식을 확인하세요. <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;확장자가 .xlsx가 아닐경우 오류가 발생할 수 있습니다. <br/> <br/>
      
        4. 엑셀 파일에 스프레드 시트가 여러개일 경우, <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;맨 앞의 시트를 읽게 되므로 시트를 확인하세요. <br/><br/>

        5. 약 1분 정도 소요될 수 있습니다. <br/>
        &nbsp;&nbsp;&nbsp;&nbsp;그 이상 초과될 경우 재실행해주세요.
        </details>
        
      </div>
      <br/>
      <hr/>
      <br/>
      <input
        type="text"
        value={inputValue}
        className="textBox"
        placeholder="  전화번호 뒤 8자리"
        onKeyDown={(event) => {
          if (event.key === "Enter") addNum();
        }}
        onChange={(event) => setInputValue(event.target.value)}
      />

      <input
      type="text"
      value={nameValue}
      className="nameBox"
      placeholder="  이름/별칭"
      onKeyDown={(event) => {
          if (event.key === "Enter") addNum();
        }}
      onChange={(event)=>setNameValue(event.target.value)}
      />


      <button onClick={addNum} className="btn">
        추가
      </button>



      <Board allNumber={allNumber} onDelete={deleteItem} />
      <br/>
      <hr/>
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <label htmlFor="excel-upload" style={{ display: 'block', marginBottom: '5px' }}>
          엑셀 파일 업로드 (.xlsx)
        </label>
        <input
          type="file"
          id="excel-upload"
          accept=".xlsx"
          onChange={handleFileChange}
          style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}
        />
        {selectedFile && (
          <p style={{ fontSize: '0.9em', color: '#555', marginTop: '5px' }}>
            선택된 파일: {selectedFile.name}
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="errorDiv">
          <strong>오류:</strong> {errorMessage}
        </div>
      )}

      <button
        className="btn"
        onClick={sendToServer}
        disabled={isLoading}
      >
        {isLoading ? "분석 중..." : "실행"}

      </button>

      {isLoading && (
        <div style={{ marginTop: '10px', color: '#555' }}>
          데이터를 분석하고 있습니다...
        </div>
      )}

      <div style={{ height: "100px" }}></div>

      {result.length > 0 && (
        <div className="result-box" style={{ overflowX: "scroll", marginTop: '20px' }}>
        <hr/>
        <h2>분석 결과</h2>
        <div className="excelBtnWrapper">
           <button className="excelButton" onClick={exportToExcel}>엑셀 파일 저장</button>
        </div>
      
          <table border="1" style={{ borderCollapse: 'collapse' , minWidth: 'max-content'}}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>phone_number</th>
                {specialNumbers.map((special) => (
                  <th key={special} colSpan={3} style={{ textAlign: "center", padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>
                    {special}
                  </th>
                ))}
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Total</th>
              </tr>
              <tr>
                {specialNumbers.map((special) => (
                  <React.Fragment key={special}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>착신</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>발신</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>총</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.phone_number}</td>
                    {specialNumbers.map((special) => (
                      <React.Fragment key={special}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row[`${special}_착신`] ?? 0}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row[`${special}_발신`] ?? 0}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row[`${special}_총`] ?? 0}</td>
                      </React.Fragment>
                    ))}
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.total}</td>
                  </tr>
              ))}
            </tbody>
          </table>
          <div style={{ height: "100px" }}></div>
        </div>
      )}
    </div>
  );
}

export default App;
