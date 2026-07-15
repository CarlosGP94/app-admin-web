import React from "react";

export interface ProductionLineData {
  id: string;
  title: string;
  description: string;
  icon: string;
  oee: string;
  productionQty: string;
  productionUnit: string;
  speed: string;
  speedUnit: string;
  lots: Array<{
    id: string;
    product: string;
    qty: string;
    temp: string;
    status: string;
    alert?: boolean;
  }>;
}

export const productionLinesConfig: Record<string, ProductionLineData> = {
  tubos: {
    id: "tubos",
    title: "Línea de Tubos",
    description:
      "Monitoreo de conformado de perfiles, extrusión y conformado de tubos de acero.",
    icon: "BlurCircularOutlined",
    oee: "84.2",
    productionQty: "8,450",
    productionUnit: "m",
    speed: "4.2",
    speedUnit: "m/s",
    lots: [
      {
        id: "TB-2026-101",
        product: 'Tubo Industrial Negro 2" x 1.5mm',
        qty: "3,100 m",
        temp: "22.1°C",
        status: "En proceso",
      },
      {
        id: "TB-2026-102",
        product: 'Tubo Estructural Redondo 3"',
        qty: "5,350 m",
        temp: "19.8°C",
        status: "En cola",
      },
    ],
  },
  mallas: {
    id: "mallas",
    title: "Línea de Mallas",
    description:
      "Supervisión de electrosoldado, cargadores de alambrón y corte a medida.",
    icon: "GridOnOutlined",
    oee: "89.7",
    productionQty: "14,820",
    productionUnit: "kg",
    speed: "12",
    speedUnit: "golpes/min",
    lots: [
      {
        id: "ML-2026-054",
        product: "Malla Electrosoldada 15x15 R-335",
        qty: "1,250 kg",
        temp: "18.4°C",
        status: "Completado",
      },
      {
        id: "ML-2026-055",
        product: "Malla Electrosoldada 20x20 R-257",
        qty: "950 kg",
        temp: "42.5°C",
        status: "Parada por Alerta",
        alert: true,
      },
    ],
  },
};
