import Image from "next/image";
import React from "react";

import { TImages, TNextImage } from "../utils/images";
import { icons } from "../utils/images";

interface IDevelopmentBtn {
    title: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    leftImage?: TNextImage | TImages;
    rightImage?: TNextImage | TImages | string;
    className?: string;
    showShareIcon?: boolean;
    btnDisable?: boolean;
}

export default function DevelopmentBtn(props: IDevelopmentBtn) {
    const { title, onClick, rightImage, leftImage, showShareIcon, className, btnDisable } = props;
    return (
      <button className={`py-2 text-white/50 support_text_bold flex flex-col items-center justify-center text-center rounded-lg gap-1 w-full border border-white/30 max-w-[400px] ${className}`} disabled={btnDisable} onClick={onClick}>
        <Image src={icons.barrierIcon} alt="icon"/>
        {title}
        {rightImage && <Image src={rightImage} alt="right-image" />}
      </button>
    );
}
