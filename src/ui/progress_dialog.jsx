import { useEffect, useState } from "react";

export default function ProgressDialog({ title = "加载中", status = { info: "", progress: 100, desc: '' } }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status.progress >= 100) {
            const timer = setTimeout(() => setVisible(false), 500);
            return () => clearTimeout(timer);
        } else {
            setVisible(true);
        }
    }, [status.progress]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-96">
                <h2 className="text-xl font-bold mb-2">{title}</h2>
                <p className="text-gray-700 mb-4">{status.info}</p>

                {status.progress > 0 && status.progress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${Math.min(status.progress, 100)}%` }}
                        ></div>
                    </div>
                )}

                <p className="text-left text-s text-gray-500 mt-1">正在读取：{status.desc}</p>
            </div>
        </div>
    );
}
