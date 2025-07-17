import React from 'react'
import PhoneNumber from './PhoneNumber'
function Board(props){
    return(

        <div>
            <h3>추가한 번호 목록</h3>
            {props.allNumber.map((item)=> (
                <PhoneNumber
                item={item}
                key={item.id}
                text={item.text}
                id={item.id}
                name={item.name}
                deleteItem={props.onDelete}
                />
            )
            )}
        </div>

    )
}

export default Board
