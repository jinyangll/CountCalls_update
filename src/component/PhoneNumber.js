import React from 'react'

function PhoneNumber(props){
    return(
        <div className='phoneNumber'>
            <pre>{props.item.text} {props.item.name} <button className="xBtn" 
                    onClick={()=>props.deleteItem(props.id)}>x</button></pre>
            
            
        </div>

    )
}

export default PhoneNumber
