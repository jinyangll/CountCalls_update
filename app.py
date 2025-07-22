#from flask import Flask, request, jsonify
#from flask_cors import CORS
#import pandas as pd
#import json
#import os


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
#CORS(app)


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Flask backend is running and ready to receive requests at /analyze"}), 200

@app.route("/analyze", methods=["POST"])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "엑셀 파일이 업로드되지 않았습니다."}), 400
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "선택된 엑셀 파일이 없습니다."}), 400

    ext = os.path.splitext(file.filename)[-1].lower()
    all_input_str = request.form.get('numbers')


    if not all_input_str:
        return jsonify({"error": "분석할 전화번호 목록이 제공되지 않았습니다."}), 400

    try:
        all_input = json.loads(all_input_str)
        for item in all_input:
            num = item["number"]
            item["number"] = f"010-{num[:4]}-{num[4:]}"
        
        if not isinstance(all_input, list):
            return jsonify({"error": "전화번호 목록 형식이 올바르지 않습니다. (리스트 형태여야 함)"}), 400
        
    except json.JSONDecodeError:
        return jsonify({"error": "제공된 전화번호 목록의 JSON 형식이 잘못되었습니다."}), 400
        
    
    
    # 수정
    try:
        if ext == '.xlsx':
            df = pd.read_excel(file, engine='openpyxl')
        elif ext == '.xls':
            df = pd.read_excel(file, engine='xlrd')
        else:
            return jsonify({"error": "지원하지 않는 파일 형식입니다. (.xls 또는 .xlsx만 허용됨)"}), 400
    except Exception as e:
        return jsonify({"error": f"엑셀 파일을 읽는 중 오류가 발생했습니다: {str(e)}"}), 500

    #####
    
    col_receive = next((col for col in df.columns if '착신자' in col.strip()), None)
    col_send = next((col for col in df.columns if '발신자' in col.strip()), None)

    if col_receive is None or col_send is None:
        return jsonify({"error": "엑셀파일에 '착신자' 또는 '발신자'가 들어가는 열이 없습니다."}), 400

    df = df[[col_receive, col_send]].copy()
    df.columns = ['receive', 'send']

    df['receive'] = df['receive'].astype(str)
    df['send'] = df['send'].astype(str)


    all_phone_numbers = pd.Index(df['receive']).append(pd.Index(df['send'])).unique()
    result_df = pd.DataFrame({'phone_number': all_phone_numbers})

    # all_input = list(set(all_input))
    all_numbers = list(item["number"] for item in all_input)

    for special in all_input:

        special_number = special["number"]
        special_name = special.get("name", "").strip()
        print(special_number)
        cond_recv = df['receive'] == special_number
        cond_send = df['send'] == special_number

        senders = df.loc[cond_recv, 'send'].value_counts()
        receivers = df.loc[cond_send, 'receive'].value_counts()
        total = senders.add(receivers, fill_value=0).astype(int)

        # formatted_special = f"010-{special[:4]}-{special[4:]}"  
        if special_name:
            label=f"{special_number} ({special_name})"
        else:
            label = special_number

        temp_df = pd.DataFrame({
            'phone_number': total.index,
            f'{label}_착신': senders.reindex(total.index, fill_value=0).astype(int),
            f'{label}_발신': receivers.reindex(total.index, fill_value=0).astype(int),
            f'{label}_총': total.values
        })

        result_df = result_df.merge(temp_df, on='phone_number', how='left')

    result_df = result_df.fillna(0).astype({col: int for col in result_df.columns if col != 'phone_number'})

    special_numbers_only = [item["number"] for item in all_input]
    result_df = result_df[~result_df['phone_number'].isin(special_numbers_only)].copy()

    total_cols = [col for col in result_df.columns if col.endswith('_총')] 
    result_df['total'] = result_df[total_cols].sum(axis=1)

    result_df['special_contact_count'] = result_df[total_cols].apply(lambda row: (row > 0).sum(), axis=1)
    # total 수 기준으로 desc 정렬
    # result_df = result_df.sort_values(by='total', ascending=False).reset_index(drop=True)

    # 복합정렬 - special_contact_count기준 desc, total기준 desc
    result_df = result_df.sort_values(
            by=['special_contact_count', 'total'],
            ascending=[False, False]
        ).reset_index(drop=True)

    return jsonify(result_df.to_dict(orient="records"))



if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
